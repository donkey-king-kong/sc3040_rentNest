package RentNest.RentNest;

import RentNest.model.ChatHistory;
import RentNest.model.User;
import RentNest.repository.ChatHistoryRepository;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RentNestIntegrationTest
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class ChatPerformanceIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ChatHistoryRepository chats;
    @Autowired JwtService jwt;
    @Autowired EntityManager entityManager;
    @Autowired EntityManagerFactory factory;

    User actor;
    User partner;
    User outsider;

    @BeforeEach
    void setUp() {
        actor = user("Actor");
        partner = user("Partner");
        outsider = user("Outsider");
    }

    User user(String name) {
        return users.save(new User().setName(name)
                .setEmail(UUID.randomUUID() + "@test.local")
                .setPassword("PRIVATE_PASSWORD")
                .setRole(User.ROLE_USER));
    }

    ChatHistory message(User sender, User receiver, String text, long timestamp) {
        ChatHistory message = new ChatHistory();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setMessage(text);
        message.setDate(new Date(timestamp));
        return chats.save(message);
    }

    String bearer(User user) {
        return "Bearer " + jwt.generateToken(user);
    }

    @Test
    void summariesReturnOnlyLatestCompactRowPerPartner() throws Exception {
        message(actor, partner, "older", 1_000);
        ChatHistory latest = message(partner, actor, "latest", 2_000);
        message(actor, outsider, "other", 1_500);

        String body = mvc.perform(get("/api/chathistory/summaries")
                        .header("Authorization", bearer(actor)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.currentUserId").value(actor.getUserID()))
                .andExpect(jsonPath("$.chats.length()").value(2))
                .andExpect(jsonPath("$.chats[0].partnerId").value(partner.getUserID()))
                .andExpect(jsonPath("$.chats[0].messageID").value(latest.getMessageID()))
                .andExpect(jsonPath("$.chats[0].message").value("latest"))
                .andReturn().getResponse().getContentAsString();

        assertFalse(body.contains("PRIVATE_PASSWORD"));
        assertFalse(body.contains("@test.local"));
        assertFalse(body.contains("older"));
    }

    @Test
    void conversationIsAuthenticatedScopedAndPaginated() throws Exception {
        for (int i = 1; i <= 55; i++) {
            message(i % 2 == 0 ? actor : partner, i % 2 == 0 ? partner : actor, "message-" + i, i);
        }
        message(partner, outsider, "private outsider message", 100);

        mvc.perform(get("/api/chathistory/conversations/{partnerId}", partner.getUserID())
                        .param("limit", "50")
                        .header("Authorization", bearer(actor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner.userID").value(partner.getUserID()))
                .andExpect(jsonPath("$.messages.length()").value(50))
                .andExpect(jsonPath("$.messages[0].message").value("message-6"))
                .andExpect(jsonPath("$.messages[49].message").value("message-55"))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private outsider message"))));
    }

    @Test
    void olderPageUsesExclusiveMessageCursorAndValidatesInputs() throws Exception {
        ChatHistory first = message(actor, partner, "first", 1_000);
        ChatHistory second = message(partner, actor, "second", 2_000);

        mvc.perform(get("/api/chathistory/conversations/{partnerId}", partner.getUserID())
                        .param("beforeMessageId", second.getMessageID().toString())
                        .header("Authorization", bearer(actor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].messageID").value(first.getMessageID()));

        mvc.perform(get("/api/chathistory/conversations/0")
                        .header("Authorization", bearer(actor)))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/chathistory/conversations/{partnerId}", actor.getUserID())
                        .header("Authorization", bearer(actor)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void queryCountsRemainBoundedAsHistoryGrows() throws Exception {
        message(actor, partner, "one", 1_000);
        entityManager.flush();
        entityManager.clear();
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        try {
            stats.clear();
            mvc.perform(get("/api/chathistory/summaries")
                            .header("Authorization", bearer(actor)))
                    .andExpect(status().isOk());
            long summaryQueries = stats.getPrepareStatementCount();

            for (int i = 0; i < 60; i++) message(actor, partner, "more-" + i, 2_000 + i);
            entityManager.flush();
            entityManager.clear();
            stats.clear();
            mvc.perform(get("/api/chathistory/summaries")
                            .header("Authorization", bearer(actor)))
                    .andExpect(status().isOk());
            assertEquals(summaryQueries, stats.getPrepareStatementCount());
            assertEquals(2, summaryQueries, "Authentication plus one scalar summary query");

            stats.clear();
            mvc.perform(get("/api/chathistory/conversations/{partnerId}", partner.getUserID())
                            .header("Authorization", bearer(actor)))
                    .andExpect(status().isOk());
            assertEquals(3, stats.getPrepareStatementCount(),
                    "Authentication, partner lookup, and one bounded message query");
        } finally {
            stats.setStatisticsEnabled(false);
        }
    }

    @Test
    void diagnosticsSanitizeIdsAndCorsAllowsHeader(CapturedOutput output) throws Exception {
        mvc.perform(get("/api/chathistory/summaries")
                        .servletPath("/api/chathistory/summaries")
                        .header("Authorization", bearer(actor))
                        .header("X-Chat-Request-Id", "unsafe_value"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Chat-Request-Id"))
                .andDo(result -> assertNotEquals("unsafe_value",
                        result.getResponse().getHeader("X-Chat-Request-Id")));
        assertTrue(output.getOut().contains("[Chat] event=request_completed"));
        assertFalse(output.getOut().contains("unsafe_value"));

        mvc.perform(options("/api/chathistory/summaries")
                        .header("Origin", "http://localhost:8081")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,X-Chat-Request-Id"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Headers"));
    }
}
