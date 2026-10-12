package RentNest.recommendation;

import RentNest.model.Listings;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MarketStatsTest {
    private Listings listing(long id, int price) {
        Listings listing = new Listings();
        listing.setListingID(id);
        listing.setPrice(price);
        listing.setType("Condo");
        listing.setLocation("Tampines");
        listing.setBeds(2);
        return listing;
    }

    @Test void marketStatsWidenTheCohortUntilThereAreEnoughComparables() {
        Listings subject = listing(1, 2000);
        Listings sameEverything = listing(2, 3000);
        Listings oneBedSameTown = listing(3, 2800); oneBedSameTown.setBeds(1);
        Listings threeBedSameTown = listing(4, 3400); threeBedSameTown.setBeds(3);

        var stats = MarketStats.forListing(subject,
                List.of(subject, sameEverything, oneBedSameTown, threeBedSameTown));

        assertEquals("condos in Tampines", stats.cohort());
        assertEquals(3, stats.sampleSize());
        assertTrue(stats.note(2000).contains("below the median for condos in Tampines"), stats.note(2000));
    }

    @Test void tooFewComparablesProduceNoMarketClaim() {
        Listings subject = listing(1, 2000);
        assertFalse(MarketStats.forListing(subject, List.of(subject, listing(2, 3000))).isKnown());
        assertEquals("", MarketStats.forListing(subject, List.of(subject)).note(2000));
    }
}
