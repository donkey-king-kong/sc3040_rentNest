package RentNest.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import RentNest.model.Listings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ListingsRepository extends JpaRepository<Listings, Long> {
    @Query("SELECT l FROM Listings l JOIN FETCH l.owner o WHERE l.tenant IS NULL " +
            "AND l.flagged = false AND o.flagged = 0 AND o.userID <> :userId")
    List<Listings> findRecommendationCandidates(@Param("userId") Long userId);

    /**
     * Stores a generated listing summary from the background summariser. A targeted update
     * avoids loading and re-saving the whole entity off the request thread.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Listings l SET l.aiSummary = :summary, l.aiSummaryKey = :key, " +
            "l.aiSummaryUpdatedAt = :updatedAt WHERE l.listingID = :id")
    int updateAiSummary(@Param("id") Long id, @Param("summary") String summary,
                        @Param("key") String key, @Param("updatedAt") Instant updatedAt);

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
