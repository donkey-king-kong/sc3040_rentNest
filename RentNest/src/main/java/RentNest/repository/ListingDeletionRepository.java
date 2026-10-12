package RentNest.repository;

import RentNest.model.Listings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Scoped cleanup for permanent deletion of an unoccupied property. */
@Repository
public class ListingDeletionRepository {
    private final JdbcTemplate jdbc;

    public ListingDeletionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Must share the locked listing's transaction, so any failure restores every row.
    @Transactional(propagation = Propagation.MANDATORY)
    public void deleteDependents(Listings listing) {
        Long id = listing.getListingID();
        String name = listing.getName();
        String location = listing.getLocation();

        // Keep conversations and existing snapshots; detach only links to removed records.
        jdbc.update("""
                UPDATE chathistory SET listingid = NULL,
                    listing_name_snapshot = COALESCE(listing_name_snapshot, ?),
                    listing_address_snapshot = COALESCE(listing_address_snapshot, ?)
                WHERE listingid = ?
                """, name, location, id);
        jdbc.update("""
                UPDATE chathistory SET rentalid = NULL,
                    listing_name_snapshot = COALESCE(listing_name_snapshot, ?),
                    listing_address_snapshot = COALESCE(listing_address_snapshot, ?)
                WHERE rentalid IN (SELECT rentalid FROM rentals WHERE listingid = ?)
                """, name, location, id);
        jdbc.update("""
                UPDATE chathistory SET requestid = NULL,
                    listing_name_snapshot = COALESCE(listing_name_snapshot, ?),
                    listing_address_snapshot = COALESCE(listing_address_snapshot, ?)
                WHERE requestid IN (
                    SELECT requestid FROM request
                    WHERE rentalid IN (SELECT rentalid FROM rentals WHERE listingid = ?))
                """, name, location, id);

        jdbc.update("DELETE FROM payment WHERE rentalid IN (SELECT rentalid FROM rentals WHERE listingid = ?)", id);
        jdbc.update("DELETE FROM request WHERE rentalid IN (SELECT rentalid FROM rentals WHERE listingid = ?)", id);
        jdbc.update("DELETE FROM rentals WHERE listingid = ?", id);
    }
}
