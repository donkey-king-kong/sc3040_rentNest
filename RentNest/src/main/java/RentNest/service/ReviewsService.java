package RentNest.service;

import RentNest.dto.ReviewsDTO;
import RentNest.model.Reviews;
import RentNest.repository.ReviewsRepository;
import RentNest.model.User;
import RentNest.dto.UserDTO;
import RentNest.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReviewsService {

    private final ReviewsRepository reviewsRepository;
    private final UserRepository userRepository;

    // Mapping Reviews to ReviewsDTO
    public ReviewsDTO toReviewsDTO(Reviews reviews) {
        ReviewsDTO reviewsDTO = new ReviewsDTO();

        // Map basic fields
        reviewsDTO.setReviewID(reviews.getReviewid());
        reviewsDTO.setTitle(reviews.getTitle());
        reviewsDTO.setText(reviews.getText());
        reviewsDTO.setRating(reviews.getRating());
        reviewsDTO.setFlagged(reviews.isFlagged());

        // Map the foreign key relationship (User to UserDTO)
        UserDTO userDTO = new UserDTO();
        userDTO.setUserId(reviews.getUser().getUserID());
        reviewsDTO.setUserID(userDTO.getUserId());

        // Fetch and map reviewer details
        User reviewer = reviews.getReviewer(); // Directly get the reviewer from the Reviews entity
        if (reviewer != null) {
            reviewsDTO.setReviewerID(reviewer.getUserID());
            reviewsDTO.setReviewerName(reviewer.getName());
            reviewsDTO.setReviewerEmail(reviewer.getEmail());
            reviewsDTO.setReviewerPhotoURL(reviewer.getPhotoURL());
        }


        return reviewsDTO;
    }

    @Autowired
    public ReviewsService(ReviewsRepository reviewsRepository, UserRepository userRepository) {
        this.reviewsRepository = reviewsRepository;
        this.userRepository = userRepository;
    }

    // Create
    @Transactional
    public ReviewsDTO createReview(ReviewsDTO reviewsDTO, Long authenticatedReviewerId) {
        if (reviewsDTO.getUserID() == null) {
            throw new IllegalArgumentException("Reviewed user ID is required.");
        }

        if (authenticatedReviewerId == null) {
            throw new SecurityException("Authentication required.");
        }

        if (reviewsDTO.getUserID().equals(authenticatedReviewerId)) {
            throw new IllegalArgumentException("Users cannot review themselves.");
        }

        reviewsRepository.findByUser_UserIDAndReviewer_UserID(
                reviewsDTO.getUserID(),
                authenticatedReviewerId
        ).ifPresent(existingReview -> {
            throw new IllegalArgumentException("Review already exists for this user pair. Use update instead.");
        });

        User user = userRepository.findById(reviewsDTO.getUserID())
                .orElseThrow(() -> new IllegalArgumentException("Reviewed user not found"));

        User reviewer = userRepository.findById(authenticatedReviewerId)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer not found"));

        // Create a new review entity
        Reviews reviews = new Reviews();
        reviews.setTitle(reviewsDTO.getTitle());
        reviews.setText(reviewsDTO.getText());
        reviews.setRating(reviewsDTO.getRating());
        reviews.setFlagged(false);
        reviews.setUser(user);
        reviews.setReviewer(reviewer);

        // Save the review and return it
        return toReviewsDTO(reviewsRepository.saveAndFlush(reviews));
    }
//    example:
//{
//    "userID": 6,
//    "rating": 100,
//    "title": "AMAZING ROOM!",
//    "text": "Nice House! ",
//    "reviewerID": 2,
//    "flagged": false
//}

    // Read
    public Optional<Reviews> getReviewById(Long id) {
        return reviewsRepository.findById(id);
    }

    public List<Reviews> getAllReviews() {
        return reviewsRepository.findAll();
    }

    // Update reviews
    public Reviews updateReview(Long id, ReviewsDTO reviewDTO, User authenticatedUser) {
        // Find the existing review by ID
        Reviews existingReview = reviewsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found with id: " + id));

        assertReviewAuthor(existingReview, authenticatedUser);

        Long requestedReviewer = reviewDTO.getReviewerID();
        if (requestedReviewer != null && !requestedReviewer.equals(existingReview.getReviewerId())) {
            throw new SecurityException("A review's author cannot be changed.");
        }

        // Update fields that can be modified
        existingReview.setRating(reviewDTO.getRating());
        existingReview.setTitle(reviewDTO.getTitle());
        existingReview.setText(reviewDTO.getText());
        // The flag is not copied from the request: editing a reported review must not clear its report.
        // Flags change only through the setFlag moderation endpoint.

        // Save and return the updated review
        return reviewsRepository.save(existingReview);
    }

    // Delete
    public void deleteReview(Long id, User authenticatedUser) {
        Reviews existingReview = reviewsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found with id: " + id));

        assertReviewDeletionAllowed(existingReview, authenticatedUser);
        reviewsRepository.delete(existingReview);
    }

    private void assertReviewAuthor(Reviews review, User authenticatedUser) {
        if (authenticatedUser == null || !review.isWrittenBy(authenticatedUser)) {
            throw new SecurityException("Only the review author can edit this review.");
        }
    }

    private void assertReviewDeletionAllowed(Reviews review, User authenticatedUser) {
        if (authenticatedUser == null || !(authenticatedUser.isAdmin() || review.isWrittenBy(authenticatedUser))) {
            throw new SecurityException("Only the review author or an admin can delete this review.");
        }
    }

    // Get Flagged Reviews
    public List<ReviewsDTO> getFlaggedReviews() {
        List<Reviews> flaggedReviews = reviewsRepository.findByFlaggedTrue();
        return flaggedReviews.stream()
                .map(this::toReviewsDTO)
                .collect(Collectors.toList());
    }

    // Update Flag
    public Optional<ReviewsDTO> updateReviewFlagged(Long reviewID, boolean flagValue) {
        // Find the review by ID
        Optional<Reviews> reviewOptional = reviewsRepository.findById(reviewID);

        // If review exists, update the flagged field and save
        if (reviewOptional.isPresent()) {
            Reviews review = reviewOptional.get();
            review.setFlagged(flagValue);  // Set flagged to the desired value (true or false)
            reviewsRepository.save(review);  // Save the updated review
            return Optional.of(toReviewsDTO(review));
        }

        // Return empty if the review was not found
        return Optional.empty();
    }

    public List<ReviewsDTO> getReviewsByUser(Long userID) {
        try {
            List<Reviews> reviews = reviewsRepository.findByUser_UserID(userID);
            return reviews.stream().map(this::toReviewsDTO).collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            // Invalid argument exceptions
            throw new RuntimeException("Invalid user ID provided: " + userID);
        } catch (NullPointerException e) {
            // Unexpected null reference occurs
            throw new RuntimeException("An unexpected null value encountered while fetching reviews for user with ID: " + userID);
        } catch (Exception e) {
            // General catch block for any other unexpected exceptions
            throw new RuntimeException("An unexpected error occurred while fetching reviews for user with ID: " + userID);
        }
    }

    public Optional<Reviews> getReviewByOwnerAndTenant(Long userId, Long reviewerId) {
        return reviewsRepository.findByUser_UserIDAndReviewer_UserID(userId, reviewerId);
    }

}
