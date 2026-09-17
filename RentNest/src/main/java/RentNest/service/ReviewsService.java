package RentNest.service;

import RentNest.dto.ReviewsDTO;
import RentNest.model.Reviews;
import RentNest.repository.ReviewsRepository;
import RentNest.model.User;
import RentNest.dto.UserDTO;
import RentNest.repository.UserRepository;
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
    public Reviews createReview(ReviewsDTO reviewsDTO) {
        // Fetch the user by userID from the UserRepository
        User user = userRepository.findById(reviewsDTO.getUserID())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch the reviewer by reviewerID from the UserRepository
        User reviewer = userRepository.findById(reviewsDTO.getReviewerID())
                .orElseThrow(() -> new RuntimeException("Reviewer not found"));

        // Create a new review entity
        Reviews reviews = new Reviews();
        reviews.setTitle(reviewsDTO.getTitle());
        reviews.setText(reviewsDTO.getText());
        reviews.setRating(reviewsDTO.getRating());
        reviews.setFlagged(reviewsDTO.isFlagged());
        reviews.setUser(user);       // Set the fetched User entity (owner)
        reviews.setReviewer(reviewer); // Set the fetched Reviewer entity (tenant)

        // Save the review and return it
        return reviewsRepository.save(reviews);
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
    public Reviews updateReview(Long id, ReviewsDTO reviewDTO) {
        // Find the existing review by ID
        Reviews existingReview = reviewsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found with id: " + id));

        // Update fields that can be modified
        existingReview.setRating(reviewDTO.getRating());
        existingReview.setTitle(reviewDTO.getTitle());
        existingReview.setText(reviewDTO.getText());
        // The flag is not copied from the request: editing a reported review must not clear its report.
        // Flags change only through the setFlag moderation endpoint.

        // If the reviewer needs to be updated, fetch the reviewer
        if (reviewDTO.getReviewerID() != null && !reviewDTO.getReviewerID().equals(existingReview.getReviewer().getUserID())) {
            User reviewer = userRepository.findById(reviewDTO.getReviewerID())
                    .orElseThrow(() -> new RuntimeException("Reviewer not found"));
            existingReview.setReviewer(reviewer);
        }

        // Save and return the updated review
        return reviewsRepository.save(existingReview);
    }

    // Delete
    public void deleteReview(Long id) {
        reviewsRepository.deleteById(id);
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
