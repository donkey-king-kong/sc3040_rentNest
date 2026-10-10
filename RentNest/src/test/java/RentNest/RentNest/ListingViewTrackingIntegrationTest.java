package RentNest.RentNest;

import RentNest.model.ListingView;
import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.ListingViewRepository;
import RentNest.repository.ListingsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.sql.Timestamp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Listing view tracking: the server records views itself, an owner cannot inflate the counts on
 * their own listing, and the analytics report views and unique viewers over the period.
 *
 * Disposable in-memory H2 database, synthetic data only.
 */
@RentNestIntegrationTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class ListingViewTrackingIntegrationTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Singapore");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private ListingsRepository listingsRepository;
    @Autowired private ListingViewRepository listingViewRepository;

    private User owner;
    private User viewerOne;
    private User viewerTwo;
    private Listings listing;

    @BeforeEach
    void setUp() {
        listingViewRepository.deleteAll();
        listingsRepository.deleteAll();
        userRepository.deleteAll();

        owner = saveUser("owner@test.local");
        viewerOne = saveUser("viewer.one@test.local");
        viewerTwo = saveUser("viewer.two@test.local");

        Listings toSave = new Listings();
        toSave.setOwner(owner);
        toSave.setName("Viewed listing");
        toSave.setPrice(2000);
        listing = listingsRepository.save(toSave);
    }

    // ---------- Recording ----------

    @Test
    void openingAListingRecordsAViewFromTheTokenAndTheServerClock() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());

        assertEquals(1, listingViewRepository.count());
        ListingView stored = listingViewRepository.findAll().get(0);
        assertEquals(listing.getListingID(), stored.getListingId());
        assertEquals(viewerOne.getUserID(), stored.getViewerUserId());
        assertEquals(ListingView.KIND_LISTING, stored.getKind());
        assertNotNull(stored.getViewedAt(), "the server should stamp the view time");
    }

    @Test
    void ownersOwnVisitIsAcceptedButNotRecorded() throws Exception {
        recordView(owner).andExpect(status().isNoContent());

        assertEquals(0, listingViewRepository.count(), "an owner must not be able to inflate their own views");
    }

    @Test
    void repeatVisitsAreRecordedSeparately() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());
        recordView(viewerOne).andExpect(status().isNoContent());

        assertEquals(2, listingViewRepository.count());
    }

    @Test
    void viewingAListingThatDoesNotExistReturns404AndRecordsNothing() throws Exception {
        mockMvc.perform(post("/api/listings/999999/views").header("Authorization", bearer(viewerOne)))
                .andExpect(status().isNotFound());

        assertEquals(0, listingViewRepository.count());
    }

    @Test
    void recordingAViewRequiresALogin() throws Exception {
        mockMvc.perform(post("/api/listings/" + listing.getListingID() + "/views"))
                .andExpect(status().isForbidden());

        assertEquals(0, listingViewRepository.count());
    }

    /**
     * Recorded views must never stop an admin removing a reported listing, so the listing
     * foreign key cascades. Without that, this delete fails on the constraint.
     */
    @Test
    void deletingAViewedListingSucceedsAndTakesItsViewsWithIt() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());
        recordView(viewerTwo).andExpect(status().isNoContent());
        assertEquals(2, listingViewRepository.count());

        mockMvc.perform(delete("/api/listings/" + listing.getListingID())
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());

        assertEquals(0, listingViewRepository.count(), "the listing's views should be removed with it");
    }

    // ---------- Analytics ----------

    @Test
    void analyticsCountViewsAndUniqueViewers() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());
        recordView(viewerOne).andExpect(status().isNoContent());
        recordView(viewerTwo).andExpect(status().isNoContent());
        recordView(owner).andExpect(status().isNoContent());     // never recorded

        mockMvc.perform(listingAnalytics(daysAgo(1), daysAhead(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingViews.availability").value("available"))
                .andExpect(jsonPath("$.metrics.listingViews.value").value(3))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.availability").value("available"))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.value").value(2))
                .andExpect(jsonPath("$.metrics.listingViews.coverage").doesNotExist());
    }

    @Test
    void noViewsIsAMeasuredZeroNotUnavailable() throws Exception {
        mockMvc.perform(listingAnalytics(daysAgo(1), daysAhead(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingViews.availability").value("available"))
                .andExpect(jsonPath("$.metrics.listingViews.value").value(0))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.value").value(0));
    }

    @Test
    void viewsOutsideThePeriodAreNotCounted() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());

        // A window that closed yesterday cannot contain a view recorded just now
        mockMvc.perform(listingAnalytics(daysAgo(3), daysAgo(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingViews.value").value(0));
    }

    @Test
    void anEmptyHistoricalPeriodHasAvailableZeroViews() throws Exception {
        mockMvc.perform(listingAnalytics("2024-01-01T00:00:00+08:00", "2024-04-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingViews.availability").value("available"))
                .andExpect(jsonPath("$.metrics.listingViews.value").value(0))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.availability").value("available"))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.value").value(0));
    }

    @Test
    void historicalViewsUseTheirRecordedDatesAndHalfOpenPeriodBoundaries() throws Exception {
        // The endpoint still uses the server clock. Only this disposable fixture is backdated.
        saveHistoricalView(viewerOne, "2026-08-01T00:00:00+08:00");
        saveHistoricalView(viewerOne, "2026-08-15T00:00:00+08:00");
        saveHistoricalView(viewerTwo, "2026-08-20T00:00:00+08:00");
        saveHistoricalView(viewerTwo, "2026-07-31T23:59:59+08:00");
        saveHistoricalView(viewerTwo, "2026-09-01T00:00:00+08:00");

        mockMvc.perform(listingAnalytics("2026-08-01T00:00:00+08:00", "2026-09-01T00:00:00+08:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.listingViews.availability").value("available"))
                .andExpect(jsonPath("$.metrics.listingViews.value").value(3))
                .andExpect(jsonPath("$.metrics.uniqueListingViewers.value").value(2))
                .andExpect(jsonPath("$.metrics.listingViews.coverage").doesNotExist());
    }

    @Test
    void unusedPhotoGalleryMetricIsNotReturned() throws Exception {
        mockMvc.perform(listingAnalytics(daysAgo(1), daysAhead(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics.photoGalleryViews").doesNotExist());
    }

    @Test
    void anotherOwnerCannotReadThisListingsViews() throws Exception {
        recordView(viewerOne).andExpect(status().isNoContent());
        User otherOwner = saveUser("other.owner@test.local");

        mockMvc.perform(get("/api/analytics/owner/listings/" + listing.getListingID())
                        .header("Authorization", bearer(otherOwner))
                        .param("from", daysAgo(1))
                        .param("to", daysAhead(1)))
                .andExpect(status().isNotFound());
    }

    // ---------- Helpers ----------

    private void saveHistoricalView(User viewer, String at) {
        ListingView view = new ListingView();
        view.setListing(listing);
        view.setViewerUserId(viewer.getUserID());
        view.setKind(ListingView.KIND_LISTING);
        ListingView saved = listingViewRepository.save(view);
        jdbcTemplate.update("UPDATE listing_view SET viewed_at = ? WHERE id = ?",
                Timestamp.from(OffsetDateTime.parse(at).toInstant()), saved.getId());
    }

    private ResultActions recordView(User viewer) throws Exception {
        return mockMvc.perform(post("/api/listings/" + listing.getListingID() + "/views")
                .header("Authorization", bearer(viewer)));
    }

    private MockHttpServletRequestBuilder listingAnalytics(String from, String to) {
        return get("/api/analytics/owner/listings/" + listing.getListingID())
                .header("Authorization", bearer(owner))
                .param("from", from)
                .param("to", to);
    }

    private static String daysAgo(int days) {
        return OffsetDateTime.now(ZONE).minusDays(days).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    private static String daysAhead(int days) {
        return OffsetDateTime.now(ZONE).plusDays(days).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User saveUser(String email) {
        return userRepository.save(new User()
                .setName(email.substring(0, email.indexOf('@')))
                .setEmail(email)
                .setPassword("not-a-real-password-hash")
                .setFlagged(0)
                .setRole(User.ROLE_USER));
    }
}
