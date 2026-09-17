package RentNest.repository;

import RentNest.model.Rentals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RentalsRepository extends JpaRepository<Rentals, Long> {
    @Query("SELECT r.tenantUserID FROM Rentals r WHERE r.listings.listingID = :listingID")
    List<Long> findTenantUserIDsByListingID(@Param("listingID") Long listingID);

    Optional<Rentals> findByListings_ListingID(Long listingID);
    
    Optional<Rentals> findByListings_ListingIDAndTenantUserID(Long listingID, Long tenantID);
}
