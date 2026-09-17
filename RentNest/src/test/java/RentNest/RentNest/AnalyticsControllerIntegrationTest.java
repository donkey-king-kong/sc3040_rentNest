package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.Payment;
import RentNest.model.Rentals;
import RentNest.model.Reviews;
import RentNest.model.User;
import RentNest.repository.ChatHistoryRepository;
import RentNest.repository.ListingsRepository;
import RentNest.repository.PaymentRepository;
import RentNest.repository.RentalsRepository;
import RentNest.repository.RequestsRepository;
import RentNest.repository.ReviewsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Date;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end analytics tests through the real security filter chain and JPA queries,
 * against a disposable in-memory H2 database. All fixture data below is synthetic.
 */
@RentNestIntegrationTest
class AnalyticsControllerIntegrationTest {

    // Reporting period: Jan-Mar 2026 in Singapore time
    private static final String FROM = "2026-01-01T00:00:00+08:00";
    private static final String TO = "2026-04-01T00:00:00+08:00";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private ListingsRepository listingsRepository;
    @Autowired private RentalsRepository rentalsRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ReviewsRepository reviewsRepository;
    @Autowired private RequestsRepository requestsRepository;
    @Autowired private ChatHistoryRepository chatHistoryRepository;

    private User ownerA;
    private User ownerB;
    private User emptyOwner;
    private User admin;
    private Listings listingA2;
    private Listings listingB1;

    @BeforeEach
    void setUp() {
        chatHistoryRepository.deleteAll();
        requestsRepository.deleteAll();
        paymentRepository.deleteAll();
        reviewsRepository.deleteAll();
        rentalsRepository.deleteAll();
        listingsRepository.deleteAll();
        userRepository.deleteAll();

        ownerA = user("owner.a@test.local", 0);
        ownerB = user("owner.b@test.local", 0);
        emptyOwner = user("empty.owner@test.local", 0);
        admin = userRepository.save(newUser("admin@test.local", 0).setRole(User.ROLE_ADMIN));
        User tenant1 = user("tenant.1@test.local", 0);
        User tenant2 = user("tenant.2@test.local", 0);
        user("flagged@test.local", 1);
        user("banned@test.local", 2);

        Listings listingA1 = listing(ownerA, "A1", false);
        listingA2 = listing(ownerA, "A2", true);
        Listings listingA3 = listing(ownerA, "A3", false);
        listingB1 = listing(ownerB, "B1", false);

        // A1: active 12-month contract
        Rentals rentalA1 = rental(listingA1, tenant1, "active", "2026-01-01T00:00:00+08:00", "2027-01-01T00:00:00+08:00");
        // A2: terminated; the app overwrites leaseExpiry with the termination date
        Rentals rentalA2 = rental(listingA2, tenant2, "terminated", "2026-02-01T00:00:00+08:00", "2026-05-01T00:00:00+08:00");
        // A3: pending offer with mixed-case status, to check status normalisation
        rental(listingA3, tenant2, "Pending", "2026-03-01T00:00:00+08:00", "2027-03-01T00:00:00+08:00");
        // B1: pending offer
        Rentals rentalB1 = rental(listingB1, tenant1, "pending", "2026-01-15T00:00:00+08:00", "2027-01-15T00:00:00+08:00");

        payment(rentalA2, 1500L, FROM);                          // exactly at from -> included
        payment(rentalA1, 2000L, "2026-03-01T00:00:00+08:00");   // March in SGT, still February in UTC
        payment(rentalA1, 2000L, TO);                            // exactly at to -> excluded
        payment(rentalB1, 1000L, "2026-02-10T12:00:00+08:00");   // other owner

        review(ownerA, tenant1, 4, false);
        review(ownerA, tenant2, 5, true);
    }

    // ---------- Authentication and ownership ----------

    @Test
    void unauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/api/analytics/owner/summary").param("from", FROM).param("to", TO))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nonAnalyticsRoutesKeepExistingUnauthenticatedBehaviour() throws Exception {
        mockMvc.perform(get("/api/listings"))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerSummaryIsIsolatedPerOwner() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schemaVersion").value(1))
                .andExpect(jsonPath("$.scope").value("owner"))
                .andExpect(jsonPath("$.metrics.listingCount.value").value(3))
                .andExpect(jsonPath("$.metrics.listingCount.basis").value("snapshot"));

        mockMvc.perform(asUser(ownerB, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingCount.value").value(1))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(1000));
    }

    @Test
    void clientSuppliedIdentityIsIgnored() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")
                        .param("ownerId", String.valueOf(ownerB.getUserID()))
                        .param("userId", String.valueOf(ownerB.getUserID()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingCount.value").value(3));
    }

    @Test
    void foreignAndNonexistentListingsReturnIdentical404() throws Exception {
        String foreign = mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingB1.getListingID())))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        String missing = mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/999999")))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(foreign, missing);
    }

    @Test
    void nonAdminCannotReadPlatformAnalytics() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/admin/summary")))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonAdminCannotReachModerationEndpoints() throws Exception {
        String ownerToken = "Bearer " + jwtService.generateToken(ownerA);
        mockMvc.perform(get("/api/users/admin/flagged").header("Authorization", ownerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/listings/admin/flagged").header("Authorization", ownerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/reviews/admin/flagged").header("Authorization", ownerToken))
                .andExpect(status().isForbidden());
        // Banning a user is moderation
        mockMvc.perform(put("/api/users/setFlag/" + ownerB.getUserID() + "/2").header("Authorization", ownerToken))
                .andExpect(status().isForbidden());
        // Dismissing a flagged listing is moderation
        mockMvc.perform(put("/api/listings/setFlag/" + listingA2.getListingID() + "/false").header("Authorization", ownerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anySignedInUserCanStillReportContent() throws Exception {
        String ownerToken = "Bearer " + jwtService.generateToken(ownerA);
        mockMvc.perform(put("/api/users/setFlag/" + ownerB.getUserID() + "/1").header("Authorization", ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/listings/setFlag/" + listingB1.getListingID() + "/true").header("Authorization", ownerToken))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanReachModerationEndpoints() throws Exception {
        String adminToken = "Bearer " + jwtService.generateToken(admin);
        mockMvc.perform(get("/api/users/admin/flagged").header("Authorization", adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/users/setFlag/" + ownerB.getUserID() + "/2").header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    // ---------- Owner aggregation ----------

    @Test
    void ownerSummaryAggregatesMatchFixture() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.activeTenancyCount.value").value(1))
                .andExpect(jsonPath("$.metrics.occupancyRate.value").value(33.3))
                .andExpect(jsonPath("$.metrics.occupancyRate.unit").value("percent"))
                .andExpect(jsonPath("$.metrics.rentalRecordCount.value").value(3))
                .andExpect(jsonPath("$.metrics.pendingRentalRecordCount.value").value(1))
                .andExpect(jsonPath("$.metrics.acceptedRentalRecordCount.value").value(2))
                .andExpect(jsonPath("$.metrics.terminatedRentalRecordCount.value").value(1))
                .andExpect(jsonPath("$.metrics.acceptanceRate.value").value(66.7))
                .andExpect(jsonPath("$.metrics.tenantsHostedCount.value").value(2))
                .andExpect(jsonPath("$.metrics.averageTenancyMonths.value").value(7.5))
                .andExpect(jsonPath("$.metrics.ownerAverageRating.value").value(4.5))
                .andExpect(jsonPath("$.metrics.ownerReviewCount.value").value(2))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount.value").value(2))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount.basis").value("period"))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(3500))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.unit").value("SGD"))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[0].bucket").value("<3 months"))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[0].value").value(0))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[1].value").value(1))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[2].value").value(0))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[3].value").value(1))
                .andExpect(jsonPath("$.series.tenancyDurationDistribution.points[4].value").value(0));
    }

    @Test
    void monthlyPaymentSeriesUsesConfiguredZoneAndIncludesZeroMonths() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period.timeZone").value("Asia/Singapore"))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points.length()").value(3))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[0].bucket").value("2026-01"))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[0].value").value(1500))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[1].bucket").value("2026-02"))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[1].value").value(0))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[2].bucket").value("2026-03"))
                .andExpect(jsonPath("$.series.monthlyRecordedRentPayments.points[2].value").value(2000));
    }

    @Test
    void ownerWithNoDataGetsAvailableZerosAndUnavailableRates() throws Exception {
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingCount.availability").value("available"))
                .andExpect(jsonPath("$.metrics.listingCount.value").value(0))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.availability").value("available"))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(0))
                .andExpect(jsonPath("$.metrics.occupancyRate.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.occupancyRate.value").value(nullValue()))
                .andExpect(jsonPath("$.metrics.acceptanceRate.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.averageTenancyMonths.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.ownerAverageRating.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.ownerAverageRating.reason").isNotEmpty());
    }

    // ---------- Per-listing ----------

    @Test
    void listingAnalyticsMatchFixture() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingA2.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("listing"))
                .andExpect(jsonPath("$.listing.name").value("A2"))
                .andExpect(jsonPath("$.metrics.occupancyStatus.value").value("vacant"))
                .andExpect(jsonPath("$.metrics.rentalRecordCount.value").value(1))
                .andExpect(jsonPath("$.metrics.averageTenancyMonths.value").value(3.0))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(1500))
                .andExpect(jsonPath("$.metrics.listingViews.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.listingViews.value").value(nullValue()))
                .andExpect(jsonPath("$.metrics.daysOnMarket.availability").value("unavailable"))
                .andExpect(jsonPath("$.series.monthlyOccupancy.points[0].value").value("vacant"))
                .andExpect(jsonPath("$.series.monthlyOccupancy.points[1].value").value("occupied"))
                .andExpect(jsonPath("$.series.monthlyOccupancy.points[2].value").value("occupied"));
    }

    // ---------- Admin ----------

    @Test
    void adminSummaryAggregatesMatchFixture() throws Exception {
        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("platform"))
                .andExpect(jsonPath("$.metrics.registeredUserCount.value").value(8))
                .andExpect(jsonPath("$.metrics.listingCount.value").value(4))
                .andExpect(jsonPath("$.metrics.ownerUserCount.value").value(2))
                .andExpect(jsonPath("$.metrics.tenantUserCount.value").value(2))
                .andExpect(jsonPath("$.metrics.bannedUserCount.value").value(1))
                .andExpect(jsonPath("$.metrics.userBanRate.value").value(12.5))
                .andExpect(jsonPath("$.metrics.flaggedUserCount.value").value(1))
                .andExpect(jsonPath("$.metrics.flaggedListingCount.value").value(1))
                .andExpect(jsonPath("$.metrics.flaggedReviewCount.value").value(1))
                .andExpect(jsonPath("$.metrics.rentalRecordCount.value").value(4))
                .andExpect(jsonPath("$.metrics.acceptedRentalRecordCount.value").value(2))
                .andExpect(jsonPath("$.metrics.terminationRate.value").value(50.0))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount.value").value(3))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(4500))
                .andExpect(jsonPath("$.metrics.reportResolutionRate.availability").value("unavailable"));
    }

    // ---------- Comparisons and occupancy over time ----------

    /*
     * Owner A, Singapore time. A1 is occupied from 1 Jan 2026 for a year; A2 from 1 Feb to 1 May 2026; A3 is only pending.
     * Payments: S$1,500 on 1 Jan, S$2,000 on 1 Mar (S$2,000 on 1 Apr falls outside both periods below).
     */

    @Test
    void occupancyOverThePeriodMatchesFixture() throws Exception {
        // 1 Jan to 1 Apr (90 days): A1 90 days + A2 59 days = 149 of 3 x 90 listing-days = 55.2%
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate.value").value(55.2))
                // The previous 90 days had no occupancy, so no change can be calculated
                .andExpect(jsonPath("$.metrics.averageOccupancyRateChange.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.tenantsInPeriodCount.value").value(2))
                .andExpect(jsonPath("$.metrics.tenantsInPeriodChange.availability").value("unavailable"))
                // Jan: 31/93, Feb: 56/84, Mar: 62/93
                .andExpect(jsonPath("$.series.monthlyOccupancyRate.points[0].value").value(33.3))
                .andExpect(jsonPath("$.series.monthlyOccupancyRate.points[1].value").value(66.7))
                .andExpect(jsonPath("$.series.monthlyOccupancyRate.points[2].value").value(66.7))
                .andExpect(jsonPath("$.series.monthlyOccupancyRate.unit").value("percent"));
    }

    @Test
    void changesAgainstThePreviousPeriodMatchFixture() throws Exception {
        // 1 Feb to 1 Apr (59 days); previous period 4 Dec 2025 to 1 Feb 2026
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"), "2026-02-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                // Rent: S$2,000 now vs S$1,500 before
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotalChange.value").value(33.3))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCountChange.value").value(0.0))
                // Occupancy: 118/177 = 66.67% now vs 31/177 = 17.51% before = +49.2 percentage points
                .andExpect(jsonPath("$.metrics.averageOccupancyRate.value").value(66.7))
                .andExpect(jsonPath("$.metrics.averageOccupancyRateChange.value").value(49.2))
                .andExpect(jsonPath("$.metrics.averageOccupancyRateChange.unit").value("percentage_points"))
                // Tenants: 2 now vs 1 before (A2 starts exactly when the previous period ends)
                .andExpect(jsonPath("$.metrics.tenantsInPeriodChange.value").value(100.0));
    }

    @Test
    void emptyPreviousPeriodMakesPaymentChangeUnavailable() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotalChange.availability").value("unavailable"))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotalChange.value").value(nullValue()));
    }

    @Test
    void ownerWithNoListingsHasNoOccupancyTrend() throws Exception {
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate.availability").value("unavailable"))
                .andExpect(jsonPath("$.series.monthlyOccupancyRate.availability").value("unavailable"));
    }

    @Test
    void listingOccupancyAndAcceptanceRate() throws Exception {
        // A2 is occupied 1 Feb to 1 Apr: 59 of 90 days
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingA2.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate.value").value(65.6))
                .andExpect(jsonPath("$.metrics.acceptanceRate.value").value(100.0));
    }

    @Test
    void userDistributionGroupsAddUpToAllUsers() throws Exception {
        // Owners: A, B. Accepted tenants: tenant 1, tenant 2. Neither: empty owner, admin, flagged, banned.
        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series.userDistribution.points[0].bucket").value("Owners only"))
                .andExpect(jsonPath("$.series.userDistribution.points[0].value").value(2))
                .andExpect(jsonPath("$.series.userDistribution.points[1].value").value(2))
                .andExpect(jsonPath("$.series.userDistribution.points[2].value").value(0))
                .andExpect(jsonPath("$.series.userDistribution.points[3].value").value(4))
                .andExpect(jsonPath("$.metrics.registeredUserCount.value").value(8));
    }

    // ---------- Period validation and boundaries ----------

    @Test
    void equivalentOffsetsProduceIdenticalResults() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"),
                        "2025-12-31T16:00:00Z", "2026-03-31T16:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount.value").value(2))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal.value").value(3500))
                .andExpect(jsonPath("$.period.from").value("2025-12-31T16:00:00Z"))
                .andExpect(jsonPath("$.period.boundary").value("[from,to)"));
    }

    @Test
    void invalidPeriodsAreRejected() throws Exception {
        String url = "/api/analytics/owner/summary";
        String token = "Bearer " + jwtService.generateToken(ownerA);

        mockMvc.perform(get(url).header("Authorization", token).param("to", TO))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token).param("from", "not-a-date").param("to", TO))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token).param("from", "2026-01-01T00:00:00").param("to", TO))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token).param("from", TO).param("to", FROM))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token).param("from", FROM).param("to", FROM))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token)
                        .param("from", "2025-01-01T00:00:00Z").param("to", "2026-01-03T00:00:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PERIOD"));
    }

    // ---------- Fixture helpers ----------

    private MockHttpServletRequestBuilder asUser(User user, MockHttpServletRequestBuilder request) {
        return asUser(user, request, FROM, TO);
    }

    private MockHttpServletRequestBuilder asUser(User user, MockHttpServletRequestBuilder request, String from, String to) {
        return request.header("Authorization", "Bearer " + jwtService.generateToken(user))
                .param("from", from)
                .param("to", to);
    }

    private User user(String email, int flagged) {
        return userRepository.save(newUser(email, flagged));
    }

    private User newUser(String email, int flagged) {
        User user = new User()
                .setName(email.substring(0, email.indexOf('@')))
                .setEmail(email)
                .setPassword("not-a-real-password-hash")
                .setFlagged(flagged);
        return user;
    }

    private Listings listing(User owner, String name, boolean flagged) {
        Listings listing = new Listings();
        listing.setOwner(owner);
        listing.setName(name);
        listing.setType("HDB");
        listing.setPrice(2000);
        listing.setFlagged(flagged);
        return listingsRepository.save(listing);
    }

    private Rentals rental(Listings listing, User tenant, String status, String rentalDate, String leaseExpiry) {
        Rentals rental = new Rentals();
        rental.setListings(listing);
        rental.setTenantUserID(tenant.getUserID());
        rental.setRentalPrice(2000L);
        rental.setDepositPrice(4000L);
        rental.setRentalDate(date(rentalDate));
        rental.setLeaseExpiry(date(leaseExpiry));
        rental.setStatus(status);
        return rentalsRepository.save(rental);
    }

    private void payment(Rentals rental, long amount, String date) {
        Payment payment = new Payment();
        payment.setRentals(rental);
        payment.setAmount(amount);
        payment.setDate(date(date));
        paymentRepository.save(payment);
    }

    private void review(User reviewed, User reviewer, int rating, boolean flagged) {
        Reviews review = new Reviews();
        review.setUser(reviewed);
        review.setReviewer(reviewer);
        review.setRating(rating);
        review.setTitle("Synthetic review");
        review.setText("Synthetic fixture text");
        review.setFlagged(flagged);
        reviewsRepository.save(review);
    }

    private static Date date(String isoOffsetDateTime) {
        Instant instant = OffsetDateTime.parse(isoOffsetDateTime).toInstant();
        return Date.from(instant);
    }
}
