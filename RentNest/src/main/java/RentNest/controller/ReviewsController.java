package RentNest.controller;

import RentNest.model.Reviews;
import RentNest.dto.ReviewsDTO;
import RentNest.service.ReviewsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/reviews")
public class ReviewsController {

    private final ReviewsService reviewsService;

    @Autowired
    public ReviewsController(ReviewsService reviewsService) {
        this.reviewsService = reviewsService;
    }

    // Create Review
    @PostMapping
    public ResponseEntity<Reviews> createReview(@RequestBody ReviewsDTO reviewsDTO) {
        Reviews createdReview = reviewsService.createReview(reviewsDTO);
        return new ResponseEntity<>(createdReview, HttpStatus.CREATED);
    }

    // Get Review by ID
    @GetMapping("/{reviewId}")
    public ResponseEntity<Reviews> getReviewById(@PathVariable Long reviewId) {
        Optional<Reviews> review = reviewsService.getReviewById(reviewId);
        return review.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Get All Reviews
    @GetMapping
    public List<Reviews> getAllReviews() {
        return reviewsService.getAllReviews();
    }

    // Update Review
    @PutMapping("/{id}")
    public ResponseEntity<Reviews> updateReview(@PathVariable Long id, @RequestBody ReviewsDTO reviewDTO) {
        Reviews updatedReview = reviewsService.updateReview(id, reviewDTO);
        return ResponseEntity.ok(updatedReview);
    }

    // Delete Review
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewsService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    // Get Flagged Reviews
    @GetMapping("/admin/flagged")
        public ResponseEntity<List<ReviewsDTO>> getFlaggedReviews() {
        List<ReviewsDTO> flaggedReviews = reviewsService.getFlaggedReviews();
        return ResponseEntity.ok(flaggedReviews);
    }

    //  Update Flag
    @PutMapping("/setFlag/{reviewID}/{flagValue}")
    public ResponseEntity<ReviewsDTO> updateReviewFlagged(@PathVariable Long reviewID, @PathVariable boolean flagValue) {
        Optional<ReviewsDTO> updatedReview = reviewsService.updateReviewFlagged(reviewID, flagValue);

        return updatedReview.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /*
        ENDPOINT for this function:
        GET /api/reviews/byOwnerAndTenant?userId=<userId>&reviewerId=<reviewerId>
    */
    // Get Review by Owner ID (userID) and Tenant ID (reviewerID)
    @GetMapping("/byOwnerAndTenant")
    public ResponseEntity<Reviews> getReviewByOwnerAndTenant(
            @RequestParam Long userId, // which is the ownerID
            @RequestParam Long reviewerId) { // reviewerID which is the tenantID
        Optional<Reviews> review = reviewsService.getReviewByOwnerAndTenant(userId, reviewerId);
        return review.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/byUser/{userId}")
    public ResponseEntity<?> getAllReviewsByUserId(@PathVariable Long userId) {
        try {
            // Fetch the reviews for the given userID
            List<ReviewsDTO> userReviews = reviewsService.getReviewsByUser(userId);

            // If the list is empty, return 204 NO CONTENT
            if (userReviews.isEmpty()) {
                return ResponseEntity.status(HttpStatus.OK)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body("No reviews found for the specified user.");
            }

            // Return the reviews as the response
            return ResponseEntity.ok(userReviews);

        } catch (IllegalArgumentException e) {
            // Return a 400 BAD REQUEST status for invalid input arguments with specific content type
            String errorMessage = "Invalid userID - " + e.getMessage() + ". The user ID provided is: " + userId;
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(errorMessage);

        } catch (NullPointerException e) {
            // Handle cases where null values cause issues (e.g., when entities are unexpectedly null)
            String errorMessage = "Unexpected null value encountered while processing userID: " + userId + ". Error details: " + e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(errorMessage);

        } catch (SecurityException e) {
            // Handle cases where access/authorization issues occur
            String errorMessage = "Access denied while fetching reviews for user with ID: " + userId + ". Please check permissions and roles.";
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(errorMessage);

        } catch (Exception e) {
            // Catch any other unhandled exceptions and return a generic internal server error
            String errorMessage = "An unexpected error occurred while fetching reviews for user with ID: " + userId + ". Error details: " + e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(errorMessage);
        }
    }
}
