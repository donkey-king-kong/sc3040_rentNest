package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.ListingsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RentNestIntegrationTest
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class InboxIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ListingsRepository listings;
    @Autowired JwtService jwt;
    @Autowired EntityManager entityManager;
    @Autowired EntityManagerFactory factory;
    @Autowired ObjectMapper json;
    User owner;
    User tenant;
    User outsider;

    @BeforeEach
    void setUp() {
        owner = user("owner");
        tenant = user("tenant");
        outsider = user("outsider");
    }

    User user(String name) {
        return users.save(new User().setName(name).setEmail(UUID.randomUUID() + "@test.local")
                .setPassword("test-only").setRole(User.ROLE_USER));
    }

    Listings listing(User owner, User tenant, String name) {
        Listings listing = new Listings();
        listing.setOwner(owner);
        listing.setTenant(tenant);
        listing.setName(name);
        listing.setLocation("Synthetic address");
        listing.setListingpicture("https://example.test/test.jpg");
        return listings.save(listing);
    }

    String bearer(User user) {
        return "Bearer " + jwt.generateToken(user);
    }

    @Test
    void ownerSeesVacantAndOccupiedPropertiesWithOnlyInboxFields() throws Exception {
        Listings vacant = listing(owner, null, "Vacant");
        listing(owner, tenant, "Occupied");
        listing(outsider, null, "Unrelated");
        String body = mvc.perform(get("/api/listings/inbox").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].listingID").value(vacant.getListingID()))
                .andExpect(jsonPath("$[0].tenantId").isEmpty())
                .andExpect(jsonPath("$[0].role").value("Owner"))
                .andExpect(jsonPath("$[1].role").value("Owner"))
                .andReturn().getResponse().getContentAsString();
        assertEquals(7, json.readTree(body).get(0).size());
        assertFalse(body.contains("password"));
        assertFalse(body.contains("email"));
        assertFalse(body.contains("description"));
    }

    @Test
    void tenantSeesOnlyTheirPropertyAndCannotSelectAnotherUser() throws Exception {
        Listings occupied = listing(owner, tenant, "Occupied");
        listing(owner, null, "Vacant");
        mvc.perform(get("/api/listings/inbox").param("userId", owner.getUserID().toString())
                        .header("Authorization", bearer(tenant)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].listingID").value(occupied.getListingID()))
                .andExpect(jsonPath("$[0].tenantId").value(tenant.getUserID()))
                .andExpect(jsonPath("$[0].role").value("Tenant"));
    }

    @Test
    void noPropertiesReturnsEmptyArrayAndOwnerWinsIfBothRolesMatch() throws Exception {
        mvc.perform(get("/api/listings/inbox").header("Authorization", bearer(outsider)))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        listing(owner, owner, "Both");
        mvc.perform(get("/api/listings/inbox").header("Authorization", bearer(owner)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].role").value("Owner"));
    }

    @Test
    void queryCountStaysConstantIncludingSerializationAsResultsGrow() throws Exception {
        String token = bearer(owner);
        listing(owner, null, "One");
        entityManager.flush();
        entityManager.clear();
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        try {
            stats.clear();
            mvc.perform(get("/api/listings/inbox").header("Authorization", token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
            long before = stats.getPrepareStatementCount();
            for (int i = 0; i < 25; i++) listing(owner, user("tenant" + i), "Property " + i);
            entityManager.flush();
            entityManager.clear();
            stats.clear();
            mvc.perform(get("/api/listings/inbox").header("Authorization", token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(26));
            assertEquals(before, stats.getPrepareStatementCount());
            assertEquals(2, before, "One authentication query and one inbox projection");
        } finally {
            stats.setStatisticsEnabled(false);
        }
    }

    @Test
    void rejectedRequestsAreLoggedAndUntrustedCorrelationIdsAreReplaced(CapturedOutput output) throws Exception {
        mvc.perform(get("/api/listings/inbox").servletPath("/api/listings/inbox")
                        .header("X-Inbox-Request-Id", "unsafe_value"))
                .andExpect(status().isForbidden())
                .andExpect(header().exists("X-Inbox-Request-Id"))
                .andDo(result -> assertNotEquals("unsafe_value",
                        result.getResponse().getHeader("X-Inbox-Request-Id")));
        assertTrue(output.getOut().contains("[Inbox] event=request_completed"));
        assertTrue(output.getOut().contains("status=403"));
        assertFalse(output.getOut().contains("unsafe_value"));
    }

    @Test
    void correlationLinksRequestAndQueryWithoutLoggingPrivateFields(CapturedOutput output) throws Exception {
        listing(owner, null, "PRIVATE_PROPERTY_MARKER");
        mvc.perform(get("/api/listings/inbox").servletPath("/api/listings/inbox")
                        .header("Authorization", bearer(owner)).header("X-Inbox-Request-Id", "inbox-test-123"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Inbox-Request-Id", "inbox-test-123"));
        assertTrue(output.getOut().contains("event=query_completed requestId=inbox-test-123 rows=1"));
        assertTrue(output.getOut().contains("event=request_completed requestId=inbox-test-123 status=200"));
        assertFalse(output.getOut().contains("PRIVATE_PROPERTY_MARKER"));
    }

    @Test
    void webPreflightAllowsCorrelationHeader() throws Exception {
        mvc.perform(options("/api/listings/inbox").header("Origin", "http://localhost:8081")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,X-Inbox-Request-Id"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Headers"));
    }
}
