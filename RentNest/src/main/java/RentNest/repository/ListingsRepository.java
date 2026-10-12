package RentNest.repository;

import java.util.List;
import java.util.Optional;

import RentNest.model.Listings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ListingsRepository extends JpaRepository<Listings, Long> {
    // Load owner and tenant in the same query: the JSON includes their names and photos,
    // and loading them lazily cost one database round trip per listing.
    @Override
    @EntityGraph(attributePaths = {"owner", "tenant"})
    List<Listings> findAll();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM Listings l WHERE l.listingID = :id")
    Optional<Listings> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT l FROM Listings l JOIN FETCH l.owner o WHERE o.userID = :ownerId " +
            "AND o.flagged = 0 AND l.flagged = false AND l.tenant IS NULL " +
            "AND NOT EXISTS (SELECT r FROM Rentals r WHERE r.listings = l AND r.status IN ('pending', 'active')) " +
            "ORDER BY l.name, l.listingID")
    List<Listings> findOfferCandidates(@Param("ownerId") Long ownerId);

    @Query("SELECT l FROM Listings l JOIN FETCH l.owner o WHERE l.tenant IS NULL " +
            "AND l.flagged = false AND o.flagged = 0 AND o.userID <> :userId")
    List<Listings> findRecommendationCandidates(@Param("userId") Long userId);

    List<Listings> findByFlaggedTrue();
    List<Listings> findByOwnerUserIDOrTenantUserID(Long ownerUserID, Long tenantUserID);

     // searchListings
     @Query("SELECT l FROM Listings l WHERE " +
        "(:term IS NULL OR LOWER(l.name) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
        "LOWER(l.type) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
        "CAST(l.postal AS string) LIKE CONCAT('%', :term, '%')) AND " +
        "(:postal IS NULL OR l.postal = :postal) AND " +
        "(:minPrice IS NULL OR l.price >= :minPrice) AND " +
        "(:maxPrice IS NULL OR l.price <= :maxPrice) AND " +
        "(:minSize IS NULL OR l.size >= :minSize) AND " +
        "(:maxSize IS NULL OR l.size <= :maxSize) AND " +
        "(:beds IS NULL OR l.beds = :beds) AND " +
        "(:bathroom IS NULL OR l.bathroom = :bathroom)")
    List<Listings> searchListings(
        @Param("term") String term,
        @Param("postal") Integer postal,
        @Param("minPrice") Integer minPrice,
        @Param("maxPrice") Integer maxPrice,
        @Param("minSize") Integer minSize,
        @Param("maxSize") Integer maxSize,
        @Param("beds") Integer beds,
        @Param("bathroom") Integer bathroom
    );

    // Query to find listing by owner ID and tenant ID
    @Query("SELECT l FROM Listings l WHERE l.owner.userID = :ownerID AND l.tenant.userID = :tenantID")
    Optional<Listings> findByOwnerUserIDAndTenantUserID(@Param("ownerID") Long ownerID, @Param("tenantID") Long tenantID);

}
