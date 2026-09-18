package RentNest.RentNest;

import RentNest.model.User;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RentNestIntegrationTest
@Transactional
class AccountProvisioningIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;
    User ordinary;
    User admin;

    @BeforeEach void fixtures() {
        ordinary = users.save(new User().setName("Ordinary").setEmail("provision.user@example.invalid")
                .setPassword(encoder.encode("TestPassword123")).setContact("test").setRole(User.ROLE_USER));
        admin = users.save(new User().setName("Admin").setEmail("provision.admin@example.invalid")
                .setPassword(encoder.encode("TestPassword123")).setContact("test").setRole(User.ROLE_ADMIN));
    }

    private String payload() throws Exception {
        return json.writeValueAsString(Map.of("userID", ordinary.getUserID(), "name", "Attempted provisioning",
                "email", "provision.new@example.invalid", "password", encoder.encode("TestPassword123"),
                "role", "ADMIN", "flagged", 0));
    }

    @Test void anonymousCannotProvisionAccounts() throws Exception {
        long count = users.count();
        mvc.perform(post("/api/users/add").contentType("application/json").content(payload()))
                .andExpect(status().isForbidden());
        assertEquals(count, users.count());
    }

    @Test void ordinaryUserCannotCreateAdminOrOverwriteAnAccount() throws Exception {
        long count = users.count();
        mvc.perform(post("/api/users/add").header("Authorization", "Bearer " + jwt.generateToken(ordinary))
                .contentType("application/json").content(payload())).andExpect(status().isForbidden());
        assertEquals(count, users.count());
        assertTrue(users.findByEmail("provision.new@example.invalid").isEmpty());
        assertEquals(User.ROLE_USER, users.findById(ordinary.getUserID()).orElseThrow().getRole());
    }

    @Test void adminProvisioningCannotAssignRoleOrIdentityFromJson() throws Exception {
        long count = users.count();
        String body = mvc.perform(post("/api/users/add").header("Authorization", "Bearer " + jwt.generateToken(admin))
                .contentType("application/json").content(payload()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"))
                .andReturn().getResponse().getContentAsString();
        assertNotEquals(ordinary.getUserID().longValue(), json.readTree(body).get("userID").asLong());
        assertEquals(count + 1, users.count());
        assertTrue(users.findByEmail("provision.user@example.invalid").isPresent());
    }

    @Test void signupAndLoginRemainUserOnlyAndExistingAdminStillWorks() throws Exception {
        mvc.perform(post("/auth/signup").contentType("application/json").content(json.writeValueAsString(
                Map.of("fullName", "Signup", "email", "provision.signup@example.invalid", "password", "TestPassword123",
                        "contact", "test", "role", "ADMIN", "userID", admin.getUserID()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"));
        String body = mvc.perform(post("/auth/login").contentType("application/json").content(
                "{\"email\":\"provision.signup@example.invalid\",\"password\":\"TestPassword123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"))
                .andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).get("token").asText();
        mvc.perform(get("/api/analytics/admin/summary").param("from", "2026-07-01T00:00:00Z")
                .param("to", "2026-08-01T00:00:00Z").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/analytics/admin/summary").param("from", "2026-07-01T00:00:00Z")
                .param("to", "2026-08-01T00:00:00Z").header("Authorization", "Bearer " + jwt.generateToken(admin)))
                .andExpect(status().isOk());
    }
}
