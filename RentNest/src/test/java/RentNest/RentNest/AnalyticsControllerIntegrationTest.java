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
import static org.hamcrest.Matchers.aMapWithSize;
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
    @Autowired private RentNest.repository.ListingViewRepository listingViewRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;

    // Reporting period: Jan-Mar 2026 in Singapore time
    private static final String FROM = "2026-01-01T00:00:00+08:00";
    private static final String TO = "2026-04-01T00:00:00+08:00";

    @Autowired private MockMvc mockMvc;
    @Autowired private RentNest.controller.AnalyticsController analyticsController;
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
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.totalListings").value(3))
                .andExpect(jsonPath("$.currency").value("SGD"));

        mockMvc.perform(asUser(ownerB, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalListings").value(1))
                .andExpect(jsonPath("$.totalRentCollected").value(1000));
    }

    @Test
    void ownerTotalListingViewsIncludesHistoryAndRepeatsAcrossListingsButExcludesOtherOwnersAndSelf() throws Exception {
        Listings another = listingsRepository.findAll().stream()
                .filter(listing -> listing.getOwner().getUserID().equals(ownerA.getUserID())
                        && !listing.getListingID().equals(listingA2.getListingID())).findFirst().orElseThrow();
        for (Listings listing : java.util.List.of(listingA2, listingA2, another, listingB1)) {
            RentNest.model.ListingView view = new RentNest.model.ListingView();
            view.setListing(listing);
            view.setViewerUserId(emptyOwner.getUserID());
            view.setKind(RentNest.model.ListingView.KIND_LISTING);
            listingViewRepository.saveAndFlush(view);
        }
        RentNest.model.ListingView selfView = new RentNest.model.ListingView();
        selfView.setListing(listingA2);
        selfView.setViewerUserId(ownerA.getUserID());
        selfView.setKind(RentNest.model.ListingView.KIND_LISTING);
        listingViewRepository.saveAndFlush(selfView);
        jdbc.update("UPDATE listing_view SET viewed_at = TIMESTAMP '2024-01-01 00:00:00'");
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(3))
                .andExpect(jsonPath("$.currency").value("SGD"));
        mockMvc.perform(asUser(ownerB, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(1));
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(0));
    }

    @Test
    void clientSuppliedIdentityIsIgnored() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")
                        .param("ownerId", String.valueOf(ownerB.getUserID()))
                        .param("userId", String.valueOf(ownerB.getUserID()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalListings").value(3));
    }

    @Test
    void foreignAndNonexistentListingsReturnIdentical404() throws Exception {
        String foreign = mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingB1.getListingID())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Listing not found."))
                .andReturn().getResponse().getContentAsString();
        String missing = mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/999999")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Listing not found."))
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(foreign, missing);
    }

    @Test
    void nonAdminCannotReadPlatformAnalytics() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/admin/summary")))
                .andExpect(status().isForbidden());
    }

    @Test
    void platformControllerPreservesServiceAccessErrorResponse() {
        var response = analyticsController.getPlatformAnalytics(ownerA, FROM, TO);
        org.junit.jupiter.api.Assertions.assertEquals(403, response.getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertEquals(java.util.Map.of(
                "error", "FORBIDDEN",
                "message", "You do not have access to platform analytics."), response.getBody());
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
                .andExpect(jsonPath("$.metrics").doesNotExist())
                .andExpect(jsonPath("$.series").doesNotExist())
                .andExpect(jsonPath("$.totalListings").value(3))
                .andExpect(jsonPath("$.occupiedListings").value(1))
                .andExpect(jsonPath("$.tenantsHosted").value(2))
                .andExpect(jsonPath("$.averageTenancyMonths").value(7.5))
                .andExpect(jsonPath("$.averageTenancyUnavailableReason").value(nullValue()))
                .andExpect(jsonPath("$.averageRating").value(4.5))
                .andExpect(jsonPath("$.averageRatingUnavailableReason").value(nullValue()))
                .andExpect(jsonPath("$.monthlyOccupancyUnavailableReason").value(nullValue()))
                .andExpect(jsonPath("$.reviewCount").value(2))
                .andExpect(jsonPath("$.totalRentCollected").value(5500))
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.tenancyLengths[0].label").value("<3 months"))
                .andExpect(jsonPath("$.tenancyLengths[0].value").value(0))
                .andExpect(jsonPath("$.tenancyLengths[1].value").value(1))
                .andExpect(jsonPath("$.tenancyLengths[2].value").value(0))
                .andExpect(jsonPath("$.tenancyLengths[3].value").value(1))
                .andExpect(jsonPath("$.tenancyLengths[4].value").value(0));
    }

    @Test
    void monthlyPaymentSeriesUsesConfiguredZoneAndIncludesZeroMonths() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.monthlyRent.length()").value(3))
                .andExpect(jsonPath("$.monthlyRent[0].label").value("2026-01"))
                .andExpect(jsonPath("$.monthlyRent[0].value").value(1500))
                .andExpect(jsonPath("$.monthlyRent[1].label").value("2026-02"))
                .andExpect(jsonPath("$.monthlyRent[1].value").value(0))
                .andExpect(jsonPath("$.monthlyRent[2].label").value("2026-03"))
                .andExpect(jsonPath("$.monthlyRent[2].value").value(2000));
    }

    @Test
    void ownerRentTotalIncludesOlderPaymentsAndIgnoresRangeWithoutChangingChartsOrPropertyTotals() throws Exception {
        Rentals ownerRental = rentalsRepository.findByListings_ListingID(listingA2.getListingID()).orElseThrow();
        Rentals otherRental = rentalsRepository.findByListings_ListingID(listingB1.getListingID()).orElseThrow();
        payment(ownerRental, 700L, "2024-01-01T00:00:00+08:00");
        payment(otherRental, 900L, "2024-01-01T00:00:00+08:00");

        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRentCollected").value(6200))
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.monthlyRent.length()").value(3))
                .andExpect(jsonPath("$.monthlyRent[0].value").value(1500))
                .andExpect(jsonPath("$.monthlyRent[1].value").value(0))
                .andExpect(jsonPath("$.monthlyRent[2].value").value(2000));

        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"),
                        "2026-03-01T00:00:00+08:00", TO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRentCollected").value(6200))
                .andExpect(jsonPath("$.monthlyRent.length()").value(1))
                .andExpect(jsonPath("$.monthlyRent[0].value").value(2000));

        mockMvc.perform(asUser(ownerB, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRentCollected").value(1900));

        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingA2.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rentCollected").value(1500))
                .andExpect(jsonPath("$.currency").value("SGD"));
    }

    @Test
    void ownerWithNoDataGetsAvailableZerosAndUnavailableRates() throws Exception {
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalListings").isNotEmpty())
                .andExpect(jsonPath("$.totalListings").value(0))
                .andExpect(jsonPath("$.totalRentCollected").isNotEmpty())
                .andExpect(jsonPath("$.totalRentCollected").value(0))
                .andExpect(jsonPath("$.averageTenancyMonths").value(nullValue()))
                .andExpect(jsonPath("$.averageTenancyUnavailableReason").value("No accepted rentals with valid start and end dates."))
                .andExpect(jsonPath("$.reviewCount").value(0))
                .andExpect(jsonPath("$.averageRating").value(nullValue()))
                .andExpect(jsonPath("$.averageRatingUnavailableReason").value("No reviews yet."))
                .andExpect(jsonPath("$.monthlyOccupancy").value(nullValue()))
                .andExpect(jsonPath("$.monthlyOccupancyUnavailableReason").value("No listings, so occupancy cannot be calculated."))
                .andExpect(jsonPath("$.monthlyRent[0].value").value(0))
                .andExpect(jsonPath("$.monthlyAverageDaysOnMarket[0].value").value(nullValue()))
                .andExpect(jsonPath("$.tenancyLengths[0].value").value(0));
    }

    @Test
    void propertyWithoutOffersReturnsZeroCountsAndUnavailableAverages() throws Exception {
        Listings property = listing(emptyOwner, "No history", false);
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/listings/" + property.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRentalOffers").value(0))
                .andExpect(jsonPath("$.acceptedOffers").value(0))
                .andExpect(jsonPath("$.paymentCount").value(0))
                .andExpect(jsonPath("$.rentCollected").value(0))
                .andExpect(jsonPath("$.occupancyRate").value(0))
                .andExpect(jsonPath("$.acceptanceRate").value(nullValue()))
                .andExpect(jsonPath("$.acceptanceRateUnavailableReason").value("No rental records, so the acceptance rate cannot be calculated."))
                .andExpect(jsonPath("$.averageTenancyMonths").value(nullValue()))
                .andExpect(jsonPath("$.averageTenancyUnavailableReason").value("No accepted rentals with valid start and end dates."))
                .andExpect(jsonPath("$.daysOnMarket").value(nullValue()))
                .andExpect(jsonPath("$.daysOnMarketUnavailableReason").isNotEmpty())
                .andExpect(jsonPath("$.monthlyRent[0].value").value(0))
                .andExpect(jsonPath("$.monthlyOccupancy[0].status").value("vacant"));
    }

    @Test
    void adminSeparatesExpiredAndUpcomingRentalsWithoutChangingStoredStatus() throws Exception {
        Instant now = Instant.now();
        User expiredTenant = user("expired.tenant@test.local", 0);
        User upcomingTenant = user("upcoming.tenant@test.local", 0);
        Rentals expired = rental(listing(ownerA, "Expired", false), expiredTenant, "active",
                now.minusSeconds(200).toString(), now.minusSeconds(100).toString());
        rental(listing(ownerA, "Upcoming", false), upcomingTenant, "active",
                now.plusSeconds(100).toString(), now.plusSeconds(200).toString());

        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRentalOffers").value(6))
                .andExpect(jsonPath("$.activeRentals").value(1))
                .andExpect(jsonPath("$.upcomingRentals").value(1))
                .andExpect(jsonPath("$.expiredRentals").value(1))
                .andExpect(jsonPath("$.unclassifiedRentals").value(0))
                .andExpect(jsonPath("$.currentTenants").value(1))
                .andExpect(jsonPath("$.expiredTenants").value(1))
                .andExpect(jsonPath("$.terminatedTenants").value(1))
                .andExpect(jsonPath("$.metrics.pastTenantUserCount").doesNotExist());
        org.junit.jupiter.api.Assertions.assertEquals("active", rentalsRepository.findById(expired.getRentalID()).orElseThrow().getStatus());
    }

    // ---------- Per-listing ----------

    @Test
    void listingAnalyticsMatchFixture() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingA2.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics").doesNotExist())
                .andExpect(jsonPath("$.series").doesNotExist())
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.name").value("A2"))
                .andExpect(jsonPath("$.occupancyStatus").value("vacant"))
                .andExpect(jsonPath("$.totalRentalOffers").value(1))
                .andExpect(jsonPath("$.averageTenancyMonths").value(3.0))
                .andExpect(jsonPath("$.rentCollected").value(1500))
                // No view events fall in this historical fixture period.
                .andExpect(jsonPath("$.totalViews").isNotEmpty())
                .andExpect(jsonPath("$.totalViews").value(0))
                .andExpect(jsonPath("$.uniqueViewers").isNotEmpty())
                .andExpect(jsonPath("$.uniqueViewers").value(0))
                .andExpect(jsonPath("$.daysOnMarket").value(nullValue()))
                .andExpect(jsonPath("$.monthlyOccupancy[0].status").value("vacant"))
                .andExpect(jsonPath("$.monthlyOccupancy[1].status").value("occupied"))
                .andExpect(jsonPath("$.monthlyOccupancy[2].status").value("occupied"));
    }

    // ---------- Admin ----------

    @Test
    void adminSummaryAggregatesMatchFixture() throws Exception {
        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics").doesNotExist())
                .andExpect(jsonPath("$.series").doesNotExist())
                .andExpect(jsonPath("$.currency").value("SGD"))
                .andExpect(jsonPath("$.registeredUsers").value(8))
                .andExpect(jsonPath("$.totalListings").value(4))
                .andExpect(jsonPath("$.propertyOwners").value(2))
                .andExpect(jsonPath("$.metrics.tenantUserCount").doesNotExist())
                .andExpect(jsonPath("$.blockedUsers").value(1))
                .andExpect(jsonPath("$.currentTenants").value(1))
                .andExpect(jsonPath("$.expiredTenants").value(0))
                .andExpect(jsonPath("$.terminatedTenants").value(1))
                .andExpect(jsonPath("$.metrics.pastTenantUserCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.userBanRate").doesNotExist())
                .andExpect(jsonPath("$.metrics.flaggedUserCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.flaggedListingCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.flaggedReviewCount").doesNotExist())
                .andExpect(jsonPath("$.totalRentalOffers").value(4))
                .andExpect(jsonPath("$.pendingRentals").value(2))
                .andExpect(jsonPath("$.terminatedRentals").value(1))
                .andExpect(jsonPath("$.upcomingRentals").value(0))
                .andExpect(jsonPath("$.expiredRentals").value(0))
                .andExpect(jsonPath("$.unclassifiedRentals").value(0))
                .andExpect(jsonPath("$.metrics.acceptedRentalRecordCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.terminationRate").doesNotExist())
                .andExpect(jsonPath("$.activeRentals").value(1))
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotal").doesNotExist())
                .andExpect(jsonPath("$.totalRentCollected").value(6500))
                .andExpect(jsonPath("$.chartFrom").doesNotExist())
                .andExpect(jsonPath("$.chartTo").doesNotExist())
                .andExpect(jsonPath("$.monthlyRent[0].label").value("2026-01"))
                .andExpect(jsonPath("$.monthlyRent[0].value").value(1500))
                .andExpect(jsonPath("$.monthlyRent[1].value").value(1000))
                .andExpect(jsonPath("$.monthlyRent[2].value").value(2000))
                .andExpect(jsonPath("$.metrics.reportResolutionRate").doesNotExist());
    }

    // ---------- Comparisons and occupancy over time ----------

    /*
     * Owner A, Singapore time. A1 is occupied from 1 Jan 2026 for a year; A2 from 1 Feb to 1 May 2026; A3 is only pending.
     * Payments: S$1,500 on 1 Jan, S$2,000 on 1 Mar (S$2,000 on 1 Apr falls outside both periods below).
     */

    @Test
    void monthlyOccupancyMatchesFixture() throws Exception {
        // 1 Jan to 1 Apr (90 days): A1 90 days + A2 59 days = 149 of 3 x 90 listing-days = 55.2%
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate").doesNotExist())
                .andExpect(jsonPath("$.metrics.averageOccupancyRateChange").doesNotExist())
                .andExpect(jsonPath("$.metrics.tenantsInPeriodCount").doesNotExist())
                .andExpect(jsonPath("$.metrics.tenantsInPeriodChange").doesNotExist())
                // Jan: 31/93, Feb: 56/84, Mar: 62/93
                .andExpect(jsonPath("$.monthlyOccupancy[0].value").value(33.3))
                .andExpect(jsonPath("$.monthlyOccupancy[1].value").value(66.7))
                .andExpect(jsonPath("$.monthlyOccupancy[2].value").value(66.7))
                .andExpect(jsonPath("$.monthlyOccupancy[0].label").value("2026-01"));
    }

    @Test
    void unusedOwnerComparisonMetricsAreNotReturned() throws Exception {
        // 1 Feb to 1 Apr (59 days); previous period 4 Dec 2025 to 1 Feb 2026
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"), "2026-02-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotalChange").doesNotExist())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCountChange").doesNotExist())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate").doesNotExist())
                .andExpect(jsonPath("$.metrics.averageOccupancyRateChange").doesNotExist())
                .andExpect(jsonPath("$.metrics.tenantsInPeriodChange").doesNotExist());
    }

    @Test
    void unusedPaymentComparisonIsNotReturned() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentTotalChange").doesNotExist());
    }

    @Test
    void ownerWithNoListingsHasNoOccupancyTrend() throws Exception {
        mockMvc.perform(asUser(emptyOwner, get("/api/analytics/owner/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.averageOccupancyRate").doesNotExist())
                .andExpect(jsonPath("$.monthlyOccupancy").value(nullValue()));
    }

    @Test
    void listingOccupancyAndAcceptanceRate() throws Exception {
        // A2 is occupied 1 Feb to 1 Apr: 59 of 90 days
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/listings/" + listingA2.getListingID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.occupancyRate").value(65.6))
                .andExpect(jsonPath("$.acceptanceRate").value(100.0));
    }

    @Test
    void unusedUserDistributionIsNotReturned() throws Exception {
        mockMvc.perform(asUser(admin, get("/api/analytics/admin/summary")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series.userDistribution").doesNotExist())
                .andExpect(jsonPath("$.registeredUsers").value(8));
    }

    // ---------- Period validation and boundaries ----------

    @Test
    void equivalentOffsetsProduceIdenticalResults() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"),
                        "2025-12-31T16:00:00Z", "2026-03-31T16:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.recordedRentPaymentCount").doesNotExist())
                .andExpect(jsonPath("$.totalRentCollected").value(5500))
                .andExpect(jsonPath("$.chartFrom").doesNotExist())
                .andExpect(jsonPath("$.chartTo").doesNotExist());
    }

    @Test
    void invalidPeriodsAreRejected() throws Exception {
        String url = "/api/analytics/owner/summary";
        String token = "Bearer " + jwtService.generateToken(ownerA);

        mockMvc.perform(get(url).header("Authorization", token).param("to", TO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PERIOD"))
                .andExpect(jsonPath("$.message").value("Both 'from' and 'to' are required ISO-8601 date-times with an offset, e.g. 2026-01-01T00:00:00+08:00."));
        mockMvc.perform(get(url).header("Authorization", token).param("from", "not-a-date").param("to", TO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PERIOD"))
                .andExpect(jsonPath("$.message").value("'from' must be an ISO-8601 date-time with an offset, e.g. 2026-01-01T00:00:00+08:00."));
        mockMvc.perform(get(url).header("Authorization", token).param("from", "2026-01-01T00:00:00").param("to", TO))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(url).header("Authorization", token).param("from", TO).param("to", FROM))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PERIOD"))
                .andExpect(jsonPath("$.message").value("'from' must be before 'to'."));
        mockMvc.perform(get(url).header("Authorization", token).param("from", FROM).param("to", FROM))
                .andExpect(status().isBadRequest());
    }

    @Test
    void propertyAndPlatformEndpointsPreserveInvalidPeriodResponse() throws Exception {
        for (String url : java.util.List.of("/api/analytics/owner/listings/" + listingA2.getListingID(),
                "/api/analytics/admin/summary")) {
            mockMvc.perform(asUser(admin, get(url), TO, FROM))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("INVALID_PERIOD"))
                    .andExpect(jsonPath("$.message").value("'from' must be before 'to'."));
        }
    }

    @Test
    void multiYearPeriodsAreAccepted() throws Exception {
        mockMvc.perform(asUser(ownerA, get("/api/analytics/owner/summary"),
                        "2024-01-01T00:00:00+08:00", "2026-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chartFrom").doesNotExist())
                .andExpect(jsonPath("$.chartTo").doesNotExist())
                .andExpect(jsonPath("$.monthlyRent.length()").value(27))
                .andExpect(jsonPath("$.totalRentCollected").value(5500));
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
