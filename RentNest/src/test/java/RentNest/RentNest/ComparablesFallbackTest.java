package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.HDBRentalContract;
import RentNest.service.ApiService;
import RentNest.service.FairPricingService;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real comparables are searched more widely (listing street, then HDB town) before any simulated data. */
public class ComparablesFallbackTest {

    @Mock private ApiService apiService;
    @Mock private ListingsService listingsService;
    private FairPricingService service;
    private Listings listing;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new FairPricingService(apiService, listingsService, true, null);
        listing = new Listings();
        listing.setName("Sengkang Family Flat");
        listing.setType("HDB");
        listing.setPostal(545128);
        listing.setBeds(3);
        listing.setFloor(10);
        listing.setPrice(3300);
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString())).thenReturn(List.of());
        when(apiService.getHDBRentalContractsByStreet(anyString(), anyString())).thenReturn(List.of());
    }

    private static List<HDBRentalContract> rentals(String street, int... rents) {
        List<HDBRentalContract> out = new ArrayList<>();
        for (int r : rents) {
            HDBRentalContract c = new HDBRentalContract();
            c.setMonthlyRent(r);
            c.setRentApprovalDate(YearMonth.now().toString());
            c.setStreetName(street);
            out.add(c);
        }
        return out;
    }

    @Test
    public void testUsesListingStreetWhenPostalStreetHasNoRentals() {
        listing.setLocation("Lorong 4 Toa Payoh");
        when(apiService.getHDBRentalContractsByStreet("LOR 4 TOA PAYOH", "4-ROOM"))
                .thenReturn(rentals("LOR 4 TOA PAYOH", 3200, 3300, 3400));

        FairPriceEstimate e = service.estimateForListing(listing);

        assertEquals("HDB", e.getDataSource());
        assertTrue(e.getBasis().contains("along LOR 4 TOA PAYOH"));
    }

    @Test
    public void testUsesTownWhenNoStreetHasRentals() {
        listing.setLocation("Sengkang");
        when(apiService.getHDBRentalContractsByTown("SENGKANG", "4-ROOM"))
                .thenReturn(rentals("COMPASSVALE RD", 3100, 3200, 3300, 3400, 3300));

        FairPriceEstimate e = service.estimateForListing(listing);

        assertEquals("HDB", e.getDataSource());
        assertTrue(e.getBasis().contains("in SENGKANG (town-wide)"));
        assertNotEquals(FairPriceEstimate.Confidence.HIGH, e.getConfidence());
    }

    @Test
    public void testFallsBackToDemoOnlyWhenNothingRealIsFound() {
        listing.setLocation("Somewhere unknown");

        FairPriceEstimate e = service.estimateForListing(listing);

        assertEquals("DEMO", e.getDataSource());
    }

    @Test
    public void testTownDetectionFromFreeText() {
        assertEquals("TOA PAYOH", ApiService.hdbTownIn("Lorong 4 Toa Payoh"));
        assertEquals("ANG MO KIO", ApiService.hdbTownIn("Ang Mo Kio Avenue 10"));
        assertEquals("SENGKANG", ApiService.hdbTownIn("Sengkang"));
        assertNull(ApiService.hdbTownIn("Grange Road"));
    }
}
