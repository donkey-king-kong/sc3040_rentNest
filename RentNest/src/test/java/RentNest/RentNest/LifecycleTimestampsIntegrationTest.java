package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.Rentals;
import RentNest.model.User;
import RentNest.repository.ChatHistoryRepository;
import RentNest.repository.ListingsRepository;
import RentNest.repository.PaymentRepository;
import RentNest.repository.RentalsRepository;
import RentNest.repository.RequestsRepository;
import RentNest.repository.ReviewsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Date;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lifecycle timestamps: the server records them itself through the real endpoints, and analytics built
 * on them respect when tracking started. Disposable in-memory H2 database, synthetic data only.
 */
@RentNestIntegrationTest
// Tracking "started" on 1 Jan 2026 for these tests
@TestPropertySource(properties = "analytics.lifecycle-tracking-start=2026-01-01T00:00:00+08:00")
class LifecycleTimestampsIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private ListingsRepository listingsRepository;
    @Autowired private RentalsRepository rentalsRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ReviewsRepository reviewsRepository;
    @Autowired private RequestsRepository requestsRepository;
    @Autowired private ChatHistoryRepository chatHistoryRepository;

    private User owner;
    private User tenant;
    private User admin;

    @BeforeEach
    void setUp() {
        chatHistoryRepository.deleteAll();
        requestsRepository.deleteAll();
        paymentRepository.deleteAll();
        reviewsRepository.deleteAll();
        rentalsRepository.deleteAll();
        listingsRepository.deleteAll();
        userRepository.deleteAll();

        owner = saveUser("owner@test.local", User.ROLE_USER, "2026-01-05T09:00:00+08:00");
        tenant = saveUser("tenant@test.local", User.ROLE_USER, "2026-03-05T09:00:00+08:00");
        admin = saveUser("admin@test.local", User.ROLE_ADMIN, "2026-02-10T09:00:00+08:00");
        saveUser("second.tenant@test.local", User.ROLE_USER, "2026-03-06T09:00:00+08:00");
    }

    // ---------- The server records the timestamps ----------

    @Test
    void signupRecordsCreationTime() throws Exception {
        Instant before = Instant.now();
        mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new@test.local\",\"password\":\"12345678\",\"fullName\":\"New User\"}"))
                .andExpect(status().isOk());

        assertRecent(userRepository.findByEmail("new@test.local").orElseThrow().getCreatedAt(), before);
    }

    @Test
    void clientCannotSetCreationTime() throws Exception {
        Instant before = Instant.now();
        mockMvc.perform(post("/api/listings").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerUserID\":" + owner.getUserID() + ",\"name\":\"New listing\",\"price\":1800,"
                                + "\"createdAt\":\"2020-01-01T00:00:00Z\"}"))
                .andExpect(status().isCreated());

        assertRecent(listingsRepository.findAll().get(0).getCreatedAt(), before);
    }

    @Test
    void offerAcceptanceAndTerminationAreRecordedOnce() throws Exception {
        Listings listing = saveListing("Offer flow listing", "2026-08-01T00:00:00+08:00");
        Instant before = Instant.now();

        // Owner sends an offer
        String offerBody = "{\"rentalDTO\":{\"listingID\":" + listing.getListingID() + ",\"tenantUserID\":" + tenant.getUserID()
                + ",\"rentalPrice\":2000,\"depositPrice\":4000,\"rentalDate\":\"2026-09-01\",\"leaseExpiry\":\"2027-09-01\","
                + "\"status\":\"pending\"},\"chatHistoryDTO\":{\"date\":\"2026-09-01T12:00:00Z\"}}";
        String created = mockMvc.perform(post("/api/rentals/createRentalOffer")
                        .param("senderID", String.valueOf(owner.getUserID()))
                        .param("receiverID", String.valueOf(tenant.getUserID()))
                        .header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON).content(offerBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long rentalId = objectMapper.readTree(created).get("rentalID").asLong();

        Rentals offered = rentalsRepository.findById(rentalId).orElseThrow();
        assertRecent(offered.getCreatedAt(), before);
        assertNull(offered.getAcceptedAt());
        assertNull(offered.getTerminatedAt());

        // Tenant accepts
        mockMvc.perform(put("/api/rentals/reviewRentalOffer/" + rentalId).header("Authorization", bearer(tenant))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listingID\":" + listing.getListingID() + ",\"tenantUserID\":" + tenant.getUserID() + ",\"status\":\"active\"}"))
                .andExpect(status().isOk());
        Rentals accepted = rentalsRepository.findById(rentalId).orElseThrow();
        assertRecent(accepted.getAcceptedAt(), before);
        assertNull(accepted.getTerminatedAt());

        // Terminated, the way the chat screen does it
        String terminateBody = "{\"listingID\":" + listing.getListingID() + ",\"tenantUserID\":" + tenant.getUserID()
                + ",\"rentalPrice\":2000,\"rentalDate\":\"2026-09-01\",\"leaseExpiry\":\"2026-09-17\",\"status\":\"terminated\"}";
        mockMvc.perform(put("/api/rentals/" + rentalId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(terminateBody))
                .andExpect(status().isOk());
        Date terminatedAt = rentalsRepository.findById(rentalId).orElseThrow().getTerminatedAt();
        assertRecent(terminatedAt, before);

        // Saving the terminated rental again keeps the original times
        mockMvc.perform(put("/api/rentals/" + rentalId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(terminateBody))
                .andExpect(status().isOk());
        Rentals afterRepeat = rentalsRepository.findById(rentalId).orElseThrow();
        assertEquals(terminatedAt.getTime(), afterRepeat.getTerminatedAt().getTime());
        assertEquals(accepted.getAcceptedAt().getTime(), afterRepeat.getAcceptedAt().getTime());
    }

    // ---------- Analytics built on the timestamps ----------

    /**
     * Fixture, all in Singapore time. Tracking started 1 Jan 2026.
     *   L1  listed 1 Feb   offer 5 Feb   accepted 11 Feb  (10 days on market)
     *   L2  listed 1 Mar   offer 10 Mar  accepted 15 Mar  terminated 25 Mar  (14 days on market)
     *   L3  listed and offered before tracking (no dates)   accepted 20 Feb  (excluded from days on market)
     *   L4  listed 10 Jan  offer 20 Mar  still pending
     */
    private void createLifecycleFixture() {
        Listings l1 = saveListing("L1", "2026-02-01T00:00:00+08:00");
        Listings l2 = saveListing("L2", "2026-03-01T00:00:00+08:00");
        Listings l3 = saveListing("L3", null);
        Listings l4 = saveListing("L4", "2026-01-10T00:00:00+08:00");

        saveRental(l1, "active", "2026-02-05T10:00:00+08:00", "2026-02-11T00:00:00+08:00", null);
        saveRental(l2, "terminated", "2026-03-10T10:00:00+08:00", "2026-03-15T00:00:00+08:00", "2026-03-25T00:00:00+08:00");
        saveRental(l3, "active", null, "2026-02-20T00:00:00+08:00", null);
        saveRental(l4, "pending", "2026-03-20T10:00:00+08:00", null, null);
    }

    @Test
    void ownerLifecycleMetricsMatchFixture() throws Exception {
        createLifecycleFixture();

        mockMvc.perform(asUser(owner, get("/api/analytics/owner/summary"), "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.newListingCount.value").value(3))
                .andExpect(jsonPath("$.metrics.offersSentCount.value").value(3))
                .andExpect(jsonPath("$.metrics.offersAcceptedCount.value").value(3))
                .andExpect(jsonPath("$.metrics.terminationsCount.value").value(1))
                .andExpect(jsonPath("$.metrics.averageDaysOnMarket.value").value(12.0))
                .andExpect(jsonPath("$.metrics.averageDaysOnMarket.unit").value("days"))
                .andExpect(jsonPath("$.metrics.offersSentCount.coverage.complete").value(true))
                .andExpect(jsonPath("$.metrics.listingCount.coverage").doesNotExist());
    }

    @Test
    void periodStartingBeforeTrackingIsMarkedPartlyCovered() throws Exception {
        createLifecycleFixture();

        mockMvc.perform(asUser(owner, get("/api/analytics/owner/summary"), "2025-12-01T00:00:00+08:00", "2026-03-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.offersSentCount.availability").value("available"))
                .andExpect(jsonPath("$.metrics.offersSentCount.coverage.complete").value(false))
                .andExpect(jsonPath("$.metrics.offersSentCount.coverage.start").value("2025-12-31T16:00:00Z"));
    }

    @Test
    void periodEndingBeforeTrackingIsUnavailableNotZero() throws Exception {
        createLifecycleFixture();

        mockMvc.perform(asUser(owner, get("/api/analytics/owner/summary"), "2025-06-01T00:00:00+08:00", "2025-12-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.offersSentCount.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.offersSentCount.value").value(nullValue()))
                .andExpect(jsonPath("$.metrics.averageDaysOnMarket.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.newListingCount.availability").value("unavailable"));
    }

    @Test
    void percentChangeNeedsTheWholePreviousPeriodTracked() throws Exception {
        createLifecycleFixture();

        // March: previous period (29 Jan to 1 Mar) is tracked. Offers sent: 1 before, 2 now.
        mockMvc.perform(asUser(owner, get("/api/analytics/owner/summary"), "2026-03-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.offersSentChange.value").value(100.0));

        // Jan to Mar: the previous period reaches back before tracking started
        mockMvc.perform(asUser(owner, get("/api/analytics/owner/summary"), "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.offersSentChange.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.offersSentChange.reason").isNotEmpty());
    }

    @Test
    void listingDaysOnMarket() throws Exception {
        createLifecycleFixture();

        mockMvc.perform(asUser(owner, get("/api/analytics/owner/listings/" + listingIdByName("L1")),
                        "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.daysOnMarket.value").value(10.0))
                .andExpect(jsonPath("$.listing.listedAt").value("2026-01-31T16:00:00Z"));

        // Published before tracking: unknown, not zero
        mockMvc.perform(asUser(owner, get("/api/analytics/owner/listings/" + listingIdByName("L3")),
                        "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.daysOnMarket.availability").value("unavailable"));

        // Never rented: counts up to now
        mockMvc.perform(asUser(owner, get("/api/analytics/owner/listings/" + listingIdByName("L4")),
                        "2026-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.daysOnMarket.value").value(greaterThan(200.0)));
    }

    @Test
    void platformGrowthMetricsMatchFixture() throws Exception {
        createLifecycleFixture();

        // March. Users: tenant 5 Mar, second tenant 6 Mar (2); previous period 29 Jan to 1 Mar: admin 10 Feb (1).
        // Listings: L2 1 Mar (1); previous period: L1 1 Feb (1).
        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary"), "2026-03-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.newUserCount.value").value(2))
                .andExpect(jsonPath("$.metrics.newUserCountChange.value").value(100.0))
                .andExpect(jsonPath("$.metrics.newListingCount.value").value(1))
                .andExpect(jsonPath("$.metrics.newListingCountChange.value").value(0.0))
                .andExpect(jsonPath("$.metrics.offersAcceptedCount.value").value(1))
                .andExpect(jsonPath("$.metrics.averageDaysOnMarket.value").value(14.0));
    }

    // ---------- Helpers ----------

    private static void assertRecent(Date date, Instant notBefore) {
        assertNotNull(date);
        Instant instant = date.toInstant();
        assertTrue(!instant.isBefore(notBefore.minusSeconds(1)), "timestamp should be from this test run: " + instant);
        assertTrue(Duration.between(instant, Instant.now()).getSeconds() < 60, "timestamp should be recent: " + instant);
    }

    private MockHttpServletRequestBuilder asUser(User user, MockHttpServletRequestBuilder request, String from, String to) {
        return request.header("Authorization", bearer(user)).param("from", from).param("to", to);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User saveUser(String email, String role, String createdAt) {
        return userRepository.save(new User()
                .setName(email.substring(0, email.indexOf('@')))
                .setEmail(email)
                .setPassword("not-a-real-password-hash")
                .setFlagged(0)
                .setRole(role)
                .setCreatedAt(date(createdAt)));
    }

    /** A null createdAt simulates a listing published before tracking started. */
    private Listings saveListing(String name, String createdAt) {
        Listings listing = new Listings();
        listing.setOwner(owner);
        listing.setName(name);
        listing.setPrice(2000);
        listing.setCreatedAt(date(createdAt));
        Listings saved = listingsRepository.save(listing);
        if (createdAt == null) {
            // created_at is not updatable through JPA by design, so clear the server-recorded time directly
            jdbcTemplate.update("UPDATE listings SET created_at = NULL WHERE listingid = ?", saved.getListingID());
        }
        return saved;
    }

    /** A null createdAt simulates an offer sent before tracking started. */
    private void saveRental(Listings listing, String status, String createdAt, String acceptedAt, String terminatedAt) {
        Rentals rental = new Rentals();
        rental.setListings(listing);
        rental.setTenantUserID(tenant.getUserID());
        rental.setRentalPrice(2000L);
        rental.setStatus(status);
        rental.setRentalDate(date("2026-02-01T00:00:00+08:00"));
        rental.setLeaseExpiry(date("2027-02-01T00:00:00+08:00"));
        rental.setCreatedAt(date(createdAt));
        rental.setAcceptedAt(date(acceptedAt));
        rental.setTerminatedAt(date(terminatedAt));
        Rentals saved = rentalsRepository.save(rental);
        if (createdAt == null) {
            jdbcTemplate.update("UPDATE rentals SET created_at = NULL WHERE rentalid = ?", saved.getRentalID());
        }
    }

    private Long listingIdByName(String name) {
        return listingsRepository.findAll().stream().filter(listing -> name.equals(listing.getName()))
                .findFirst().orElseThrow().getListingID();
    }

    private static Date date(String isoOffsetDateTime) {
        return isoOffsetDateTime == null ? null : Date.from(OffsetDateTime.parse(isoOffsetDateTime).toInstant());
    }
}
