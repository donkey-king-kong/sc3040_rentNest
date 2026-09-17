package RentNest.repository;

import RentNest.model.Reviews;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewsRepository extends JpaRepository<Reviews, Long> {
    List<Reviews> findByFlaggedTrue();

    // Find all reviews for a specific user being reviewed
    List<Reviews> findByUser_UserID(Long userID);

    // Find a review by user and reviewer
    Optional<Reviews> findByUser_UserIDAndReviewer_UserID(Long userId, Long reviewerId);

}
