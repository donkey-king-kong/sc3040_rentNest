package RentNest.repository;

import RentNest.model.Rentals;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RentalsRepository extends JpaRepository<Rentals, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Rentals r WHERE r.rentalID = :rentalID")
    Optional<Rentals> findByIdForUpdate(@Param("rentalID") Long rentalID);

    @Query("SELECT r.listings.listingID FROM Rentals r WHERE r.rentalID = :rentalID")
    Optional<Long> findListingIdByRentalID(@Param("rentalID") Long rentalID);

    boolean existsByListings_ListingID(Long listingID);

    @Query("SELECT r.tenantUserID FROM Rentals r WHERE r.listings.listingID = :listingID AND r.status = 'active'")
    List<Long> findTenantUserIDsByListingID(@Param("listingID") Long listingID);

    @Query("SELECT r FROM Rentals r JOIN FETCH r.listings l JOIN FETCH l.owner " +
            "WHERE l.listingID = :listingID AND r.status IN ('pending', 'active')")
    Optional<Rentals> findByListings_ListingID(@Param("listingID") Long listingID);
    
    @Query("SELECT r FROM Rentals r JOIN FETCH r.listings l JOIN FETCH l.owner " +
            "WHERE l.listingID = :listingID AND r.tenantUserID = :tenantID AND r.status = 'active'")
    Optional<Rentals> findByListings_ListingIDAndTenantUserID(
            @Param("listingID") Long listingID, @Param("tenantID") Long tenantID);
}
