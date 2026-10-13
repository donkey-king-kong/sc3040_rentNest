package RentNest.repository;

import RentNest.model.Rentals;
import RentNest.dto.OwnerTenantSummaryDTO;
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
    String OWNER_SUMMARY = "SELECT new RentNest.dto.OwnerTenantSummaryDTO(" +
            "r.rentalID, l.listingID, o.userID, t.userID, t.name, t.photoURL, " +
            "r.status, r.rentalPrice, r.rentalDate, r.leaseExpiry) " +
            "FROM Rentals r JOIN r.listings l JOIN l.owner o JOIN l.tenant t " +
            "WHERE o.userID = :ownerId AND r.status = 'active' AND r.tenantUserID = t.userID ";

    @Query(OWNER_SUMMARY + "AND l.listingID = :listingId AND t.userID = :tenantId")
    Optional<OwnerTenantSummaryDTO> findOwnerTenantSummary(
            @Param("ownerId") Long ownerId, @Param("listingId") Long listingId, @Param("tenantId") Long tenantId);

    @Query(OWNER_SUMMARY + "AND r.rentalID = :rentalId")
    Optional<OwnerTenantSummaryDTO> findOwnerPaymentContext(
            @Param("ownerId") Long ownerId, @Param("rentalId") Long rentalId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Rentals r WHERE r.rentalID = :rentalID")
    Optional<Rentals> findByIdForUpdate(@Param("rentalID") Long rentalID);

    @Query("SELECT r.listings.listingID FROM Rentals r WHERE r.rentalID = :rentalID")
    Optional<Long> findListingIdByRentalID(@Param("rentalID") Long rentalID);

    boolean existsByListings_ListingID(Long listingID);

    boolean existsByListings_ListingIDAndStatus(Long listingID, String status);

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
