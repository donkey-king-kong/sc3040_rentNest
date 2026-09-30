package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.HDBRentalContract;
import RentNest.service.ApiService;
import RentNest.service.FairPricingService;
import RentNest.service.GeminiClient;
import RentNest.service.ListingsService;
import RentNest.service.RoomTypeClassifier;
import RentNest.service.RoomTypeClassifier.Classification;
import RentNest.service.RoomTypeClassifier.UnitType;
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

public class RoomPricingTest {

    @Mock
    private ApiService apiService;

    @Mock
    private ListingsService listingsService;

    @Mock
    private RoomTypeClassifier classifier;

    private FairPricingService service;
    private Listings listing;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new FairPricingService(apiService, listingsService, false, classifier);

        List<HDBRentalContract> contracts = new ArrayList<>();
        String month = YearMonth.now().toString();
        for (int rent : new int[]{2800, 2900, 2900, 3000, 2900}) {
            HDBRentalContract c = new HDBRentalContract();
            c.setMonthlyRent(rent);
            c.setRentApprovalDate(month);
            c.setStreetName("JURONG EAST ST 13");
            contracts.add(c);
        }
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString())).thenReturn(contracts);

        listing = new Listings();
        listing.setName("Jurong East Master Bedroom");
        listing.setType("HDB");
        listing.setPostal(600131);
        listing.setBeds(1);
        listing.setSize(150);
        listing.setFloor(10);
        listing.setPrice(1300);
    }

    // ---------------- pricing ----------------

    @Test
    public void testMasterRoomPricedAsShareOfWholeFlat() {
        when(classifier.classify(any(), any())).thenReturn(new Classification(UnitType.MASTER_ROOM, null, "AI"));

        FairPriceEstimate e = service.estimateForListing(listing);

        // Default whole flat for a room is 3 bedrooms (4-ROOM); median $2900 x 45% = $1305 -> $1310.
        verify(apiService).getHDBRentalContractsByFlatType("600131", "4-ROOM");
        assertTrue(e.isAvailable());
        assertEquals(1310, e.getFairPrice());
        assertEquals("MASTER_ROOM", e.getUnitType());
        assertEquals("AI", e.getUnitTypeSource());
        assertEquals(0.45, e.getRentShare());
        assertEquals("EXCELLENT", e.getTier().name());
        assertTrue(e.getBasis().startsWith("master rooms, priced at 45% of 4-ROOM HDB flats"));
    }

    @Test
    public void testCommonRoomUsesStatedFlatSize() {
        when(classifier.classify(any(), any())).thenReturn(new Classification(UnitType.COMMON_ROOM, 2, "keywords"));

        FairPriceEstimate e = service.estimateForListing(listing);

        verify(apiService).getHDBRentalContractsByFlatType("600131", "3-ROOM");
        assertEquals(1020, e.getFairPrice()); // $2900 x 35% = $1015 -> $1020
        assertEquals(0.35, e.getRentShare());
    }

    @Test
    public void testWholeUnitPricedNormally() {
        when(classifier.classify(any(), any())).thenReturn(new Classification(UnitType.WHOLE_UNIT, null, "AI"));
        listing.setBeds(2);

        FairPriceEstimate e = service.estimateForListing(listing);

        verify(apiService).getHDBRentalContractsByFlatType("600131", "3-ROOM");
        assertEquals(2900, e.getFairPrice());
        assertEquals("WHOLE_UNIT", e.getUnitType());
        assertNull(e.getRentShare());
    }

    // ---------------- classifier ----------------

    @Test
    public void testKeywordFallbackWhenAiNotConfigured() {
        RoomTypeClassifier c = new RoomTypeClassifier(new GeminiClient("", ""));

        assertEquals(UnitType.MASTER_ROOM, c.classify("Jurong East Master Bedroom", null).unitType());
        assertEquals("keywords", c.classify("Jurong East Master Bedroom", null).source());
        assertEquals(UnitType.COMMON_ROOM, c.classify("Cosy common room near MRT", "In a 4-room flat").unitType());
        assertEquals(3, c.classify("Cosy common room near MRT", "In a 4-room flat").wholeUnitBedrooms());
        assertEquals(UnitType.WHOLE_UNIT, c.classify("Spacious 3-bedroom HDB", "Whole unit, 3 bedrooms").unitType());
    }
}
