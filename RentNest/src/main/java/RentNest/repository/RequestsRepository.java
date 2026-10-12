package RentNest.repository;

import RentNest.model.Requests;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequestsRepository extends JpaRepository<Requests, Long> {
    @Override
    @EntityGraph(attributePaths = {"rentals", "rentals.listings", "rentals.listings.owner"})
    Optional<Requests> findById(Long requestID);

    @EntityGraph(attributePaths = {"rentals", "rentals.listings", "rentals.listings.owner"})
    @Query("SELECT r FROM Requests r WHERE r.rentals.tenantUserID = :actor"
            + " OR r.rentals.listings.owner.userID = :actor")
    List<Requests> findAllForParticipant(@Param("actor") Long actor);

    boolean existsByRentals_RentalID(Long rentalID);

    @Query("SELECT r.rentals.rentalID FROM Requests r WHERE r.requestID = :requestID")
    Optional<Long> findRentalIdByRequestID(@Param("requestID") Long requestID);
}
