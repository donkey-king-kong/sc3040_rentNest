package RentNest.RentNest;

import RentNest.model.Listings;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Editing and deleting listings and reviews through the real security filter chain, against a
 * disposable in-memory H2 database. Only the owner/author may edit content; admins can delete
 * content and dismiss reports. Ownership and authorship cannot be reassigned. All data is synthetic.
 */
@RentNestIntegrationTest
class OwnershipAuthorizationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private ListingsRepository listingsRepository;
    @Autowired private ReviewsRepository reviewsRepository;
    @Autowired private RentalsRepository rentalsRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private RequestsRepository requestsRepository;
    @Autowired private ChatHistoryRepository chatHistoryRepository;
    @Autowired private RentNest.service.ReviewsService reviewsService;
    @Autowired private RentNest.service.ListingsService listingsService;

    private User owner;
    private User otherUser;
    private User admin;
    private Listings listing;
    private Reviews review;

    @BeforeEach
    void setUp() {
        chatHistoryRepository.deleteAll();
        requestsRepository.deleteAll();
        paymentRepository.deleteAll();
        reviewsRepository.deleteAll();
        rentalsRepository.deleteAll();
        listingsRepository.deleteAll();
        userRepository.deleteAll();

        owner = saveUser("owner@test.local", User.ROLE_USER);
        otherUser = saveUser("other@test.local", User.ROLE_USER);
        admin = saveUser("admin@test.local", User.ROLE_ADMIN);

        listing = new Listings();
        listing.setOwner(owner);
        listing.setName("Synthetic listing");
        listing.setPrice(2000);
        listing = listingsRepository.save(listing);

        // otherUser writes a review about owner
        review = new Reviews();
        review.setReviewer(otherUser);
        review.setUser(owner);
        review.setRating(3);
        review.setTitle("Synthetic review");
        review.setText("Synthetic fixture text");
        review = reviewsRepository.save(review);
    }

    // ---------- Listings ----------

    @Test
    void ownerCanDeleteOwnListing() throws Exception {
        mockMvc.perform(delete("/api/listings/" + listing.getListingID()).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        assertFalse(listingsRepository.existsById(listing.getListingID()));
    }

    @Test
    void otherUserCannotDeleteSomeoneElsesListing() throws Exception {
        mockMvc.perform(delete("/api/listings/" + listing.getListingID()).header("Authorization", bearer(otherUser)))
                .andExpect(status().isForbidden());
        assertTrue(listingsRepository.existsById(listing.getListingID()));
    }

    @Test
    void adminCanDeleteAnyListing() throws Exception {
        mockMvc.perform(delete("/api/listings/" + listing.getListingID()).header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());
        assertFalse(listingsRepository.existsById(listing.getListingID()));
    }

    @Test
    void deletingMissingListingReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/listings/999999").header("Authorization", bearer(owner)))
                .andExpect(status().isNotFound());
    }

    // ---------- Reviews ----------

    @Test
    void authorCanDeleteOwnReview() throws Exception {
        mockMvc.perform(delete("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(otherUser)))
                .andExpect(status().isNoContent());
        assertFalse(reviewsRepository.existsById(review.getReviewid()));
    }

    @Test
    void reviewedUserCannotDeleteReviewsAboutThem() throws Exception {
        mockMvc.perform(delete("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(owner)))
                .andExpect(status().isForbidden());
        assertTrue(reviewsRepository.existsById(review.getReviewid()));
    }

    @Test
    void adminCanDeleteAnyReview() throws Exception {
        mockMvc.perform(delete("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());
        assertFalse(reviewsRepository.existsById(review.getReviewid()));
    }

    // ---------- Editing listings ----------

    @Test
    void ownerCanEditOwnListing() throws Exception {
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed by owner\",\"price\":2500}"))
                .andExpect(status().isOk());
        assertEquals("Renamed by owner", listingsRepository.findById(listing.getListingID()).orElseThrow().getName());
    }

    @Test
    void otherUserCannotEditSomeoneElsesListing() throws Exception {
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hijacked\",\"price\":1}"))
                .andExpect(status().isForbidden());
        assertEquals("Synthetic listing", listingsRepository.findById(listing.getListingID()).orElseThrow().getName());
    }

    @Test
    void ownerCannotHandListingToSomeoneElse() throws Exception {
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Synthetic listing\",\"ownerUserID\":" + otherUser.getUserID() + "}"))
                .andExpect(status().isForbidden());
        assertEquals(owner.getUserID(), listingsRepository.findById(listing.getListingID()).orElseThrow().getOwnerId());
    }

    // ---------- Editing reviews ----------

    @Test
    void reviewedUserCannotEditReviewsAboutThem() throws Exception {
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"title\":\"Actually great\",\"text\":\"Changed by the reviewed user\"}"))
                .andExpect(status().isForbidden());
        assertEquals(3, reviewsRepository.findById(review.getReviewid()).orElseThrow().getRating());
    }

    @Test
    void editingAReportedReviewKeepsItsReport() throws Exception {
        review.setFlagged(true);
        reviewsRepository.save(review);

        // The app's edit screen always sends flagged:false
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"title\":\"Edited\",\"text\":\"Edited text\",\"reviewerID\":" + otherUser.getUserID() + ",\"flagged\":false}"))
                .andExpect(status().isOk());

        Reviews edited = reviewsRepository.findById(review.getReviewid()).orElseThrow();
        assertEquals(4, edited.getRating());
        assertTrue(edited.isFlagged());
    }

    @Test
    void authorCannotReattributeTheirReview() throws Exception {
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":1,\"title\":\"Edited\",\"text\":\"Edited text\",\"reviewerID\":" + admin.getUserID() + "}"))
                .andExpect(status().isForbidden());
        assertEquals(otherUser.getUserID(), reviewsRepository.findById(review.getReviewid()).orElseThrow().getReviewerId());
    }

    @Test
    void adminCannotEditOtherUsersContentOrReassignIt() throws Exception {
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Admin edit\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ownerUserID\":" + admin.getUserID() + "}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":1,\"title\":\"Admin edit\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reviewerID\":" + admin.getUserID() + "}"))
                .andExpect(status().isForbidden());
        assertEquals("Synthetic listing", listingsRepository.findById(listing.getListingID()).orElseThrow().getName());
        assertEquals(owner.getUserID(), listingsRepository.findById(listing.getListingID()).orElseThrow().getOwnerId());
        assertEquals(3, reviewsRepository.findById(review.getReviewid()).orElseThrow().getRating());
        assertEquals(otherUser.getUserID(), reviewsRepository.findById(review.getReviewid()).orElseThrow().getReviewerId());
    }

    @Test
    void adminCanEditOwnContentWithUnchangedIdentityButCannotReassignIt() throws Exception {
        listing.setOwner(admin);
        listingsRepository.save(listing);
        review.setReviewer(admin);
        reviewsRepository.save(review);
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Own listing\",\"ownerUserID\":" + admin.getUserID() + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":4,\"title\":\"Own review\",\"text\":\"Edited\",\"reviewerID\":" + admin.getUserID() + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/listings/" + listing.getListingID()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ownerUserID\":" + owner.getUserID() + "}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/reviews/" + review.getReviewid()).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reviewerID\":" + otherUser.getUserID() + "}"))
                .andExpect(status().isForbidden());
        assertEquals("Own listing", listingsRepository.findById(listing.getListingID()).orElseThrow().getName());
        assertEquals("Own review", reviewsRepository.findById(review.getReviewid()).orElseThrow().getTitle());
    }

    @Test
    void servicesRejectReassignmentEvenWithoutControllerChecks() {
        RentNest.dto.ListingsDTO listingDto = new RentNest.dto.ListingsDTO();
        listingDto.setOwnerUserID(otherUser.getUserID());
        org.junit.jupiter.api.Assertions.assertThrows(SecurityException.class,
                () -> listingsService.updateListing(listing.getListingID(), listingDto));
        RentNest.dto.ReviewsDTO reviewDto = new RentNest.dto.ReviewsDTO();
        org.junit.jupiter.api.Assertions.assertThrows(SecurityException.class,
                () -> reviewsService.updateReview(review.getReviewid(), reviewDto, admin));
        otherUser.setRole(User.ROLE_ADMIN);
        userRepository.save(otherUser);
        reviewDto.setReviewerID(owner.getUserID());
        org.junit.jupiter.api.Assertions.assertThrows(SecurityException.class,
                () -> reviewsService.updateReview(review.getReviewid(), reviewDto, otherUser));
    }

    @Test
    void adminCanStillDismissListingAndReviewReports() throws Exception {
        listing.setFlagged(true);
        listingsRepository.save(listing);
        review.setFlagged(true);
        reviewsRepository.save(review);
        mockMvc.perform(put("/api/listings/setFlag/" + listing.getListingID() + "/false")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/reviews/setFlag/" + review.getReviewid() + "/false")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        assertFalse(listingsRepository.findById(listing.getListingID()).orElseThrow().isFlagged());
        assertFalse(reviewsRepository.findById(review.getReviewid()).orElseThrow().isFlagged());
    }

    // ---------- Unauthenticated ----------

    @Test
    void unauthenticatedDeleteIsRejected() throws Exception {
        mockMvc.perform(delete("/api/listings/" + listing.getListingID()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/reviews/" + review.getReviewid()))
                .andExpect(status().isForbidden());
        assertTrue(listingsRepository.existsById(listing.getListingID()));
        assertTrue(reviewsRepository.existsById(review.getReviewid()));
    }

    private User saveUser(String email, String role) {
        return userRepository.save(new User()
                .setName(email.substring(0, email.indexOf('@')))
                .setEmail(email)
                .setPassword("not-a-real-password-hash")
                .setFlagged(0)
                .setRole(role));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}
