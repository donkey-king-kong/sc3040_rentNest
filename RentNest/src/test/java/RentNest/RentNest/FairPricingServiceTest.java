package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceEstimate.Tier;
import RentNest.model.api.HDBRentalContract;
import RentNest.model.api.RentalContract;
import RentNest.service.ApiService;
import RentNest.service.FairPricingService;
import RentNest.service.FairPricingService.ComparableTransaction;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class FairPricingServiceTest {

    @Mock
    private ApiService apiService;

    @Mock
    private ListingsService listingsService;

    private FairPricingService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new FairPricingService(apiService, listingsService);
    }

    private static List<ComparableTransaction> comps(int... rents) {
        List<ComparableTransaction> out = new ArrayList<>();
        YearMonth now = YearMonth.now();
        for (int r : rents) out.add(new ComparableTransaction(r, null, now));
        return out;
    }

    // ---------------- pure model ----------------

    @Test
    public void testInsufficientDataBelowMinimum() {
        FairPriceEstimate e = service.computeEstimate(comps(3000, 3100), null, null, 3000, "HDB", "test");
        assertFalse(e.isAvailable());
        assertEquals(Tier.INSUFFICIENT_DATA, e.getTier());
        assertEquals(2, e.getComparableCount());
    }

    @Test
    public void testFairPriceAndTiers() {
        FairPriceEstimate e = service.computeEstimate(comps(2800, 2900, 3000, 3100, 3200), null, null, 3000, "HDB", "test");
        assertTrue(e.isAvailable());
        assertEquals(5, e.getComparableCount());
        assertEquals(3000, e.getFairPrice());
        assertEquals(3, e.getTiers().size());
        assertEquals(Tier.EXCELLENT, e.getTiers().get(0).getName());
        assertEquals(2850, e.getTiers().get(0).getLow());
        assertEquals(3150, e.getTiers().get(0).getHigh());
        assertEquals(2700, e.getTiers().get(1).getLow());
        assertEquals(3300, e.getTiers().get(1).getHigh());
        assertEquals(2550, e.getGoodLow());
        assertEquals(3450, e.getGoodHigh());
        assertEquals(Tier.EXCELLENT, e.getTier());
        assertEquals(0.0, e.getPercentDiffFromFair());
    }

    @Test
    public void testAskingPriceIsClassifiedIntoNarrowestBand() {
        List<ComparableTransaction> c = comps(3000, 3000, 3000, 3000, 3000);
        assertEquals(Tier.EXCELLENT, service.computeEstimate(c, null, null, 3100, "HDB", "t").getTier());
        assertEquals(Tier.GREAT, service.computeEstimate(c, null, null, 3250, "HDB", "t").getTier());
        assertEquals(Tier.GOOD, service.computeEstimate(c, null, null, 2600, "HDB", "t").getTier());
        assertEquals(Tier.OUTSIDE_RANGE, service.computeEstimate(c, null, null, 4000, "HDB", "t").getTier());
        assertEquals(Tier.OUTSIDE_RANGE, service.computeEstimate(c, null, null, 2000, "HDB", "t").getTier());
        assertTrue(service.computeEstimate(c, null, null, 4000, "HDB", "t").getPercentDiffFromFair() > 0);
        assertTrue(service.computeEstimate(c, null, null, 2000, "HDB", "t").getPercentDiffFromFair() < 0);
    }

    @Test
    public void testNoAskingPriceGivesNoTier() {
        FairPriceEstimate e = service.computeEstimate(comps(2800, 2900, 3000, 3100, 3200), null, null, null, "HDB", "t");
        assertTrue(e.isAvailable());
        assertNull(e.getTier());
        assertNull(e.getPercentDiffFromFair());
    }

    @Test
    public void testOutlierIsTrimmed() {
        // One absurd transaction should not drag the range.
        FairPriceEstimate e = service.computeEstimate(comps(2800, 2900, 3000, 3100, 3200, 30000), null, null, null, "HDB", "t");
        assertEquals(5, e.getComparableCount());
        assertTrue(e.getFairPrice() <= 3200);
    }

    @Test
    public void testRecencyWeightingFavoursRecentTransactions() {
        YearMonth now = YearMonth.now();
        List<ComparableTransaction> c = new ArrayList<>();
        // Old, cheap transactions
        for (int i = 0; i < 5; i++) c.add(new ComparableTransaction(2000, null, now.minusYears(4)));
        // Recent, more expensive transactions
        for (int i = 0; i < 5; i++) c.add(new ComparableTransaction(3000, null, now));
        FairPriceEstimate e = service.computeEstimate(c, null, null, null, "HDB", "t");
        assertEquals(3000, e.getFairPrice());
        assertEquals(now.minusYears(4).toString(), e.getPeriodStart());
        assertEquals(now.toString(), e.getPeriodEnd());
    }

    @Test
    public void testSizeAdjustmentScalesEstimate() {
        YearMonth now = YearMonth.now();
        List<ComparableTransaction> c = new ArrayList<>();
        for (int i = 0; i < 5; i++) c.add(new ComparableTransaction(3000, 1000.0, now));
        FairPriceEstimate bigger = service.computeEstimate(c, 1500, null, null, "URA", "t");
        FairPriceEstimate smaller = service.computeEstimate(c, 700, null, null, "URA", "t");
        FairPriceEstimate same = service.computeEstimate(c, 1000, null, null, "URA", "t");
        assertTrue(bigger.getFairPrice() > same.getFairPrice());
        assertTrue(smaller.getFairPrice() < same.getFairPrice());
        assertEquals(3000, same.getFairPrice());
        // Clamped to +25% at most
        assertTrue(bigger.getFairPrice() <= 3750);
    }

    @Test
    public void testFloorAdjustmentIsBoundedAndDirectional() {
        List<ComparableTransaction> c = comps(3000, 3000, 3000, 3000);
        FairPriceEstimate high = service.computeEstimate(c, null, 40, null, "URA", "t");
        FairPriceEstimate low = service.computeEstimate(c, null, 1, null, "URA", "t");
        FairPriceEstimate ref = service.computeEstimate(c, null, 10, null, "URA", "t");
        assertEquals(3000, ref.getFairPrice());
        assertEquals(3180, high.getFairPrice()); // +6% cap
        assertTrue(low.getFairPrice() < 3000);
    }

    @Test
    public void testParseAreaSqftBands() {
        assertEquals(1050.0, FairPricingService.parseAreaSqft("1000-1100"));
        assertEquals(3000.0, FairPricingService.parseAreaSqft(">3000"));
        assertNull(FairPricingService.parseAreaSqft("NA"));
        assertNull(FairPricingService.parseAreaSqft(null));
    }

    @Test
    public void testHdbStreetNameNormalisation() {
        assertEquals("TAMPINES ST 21", ApiService.normaliseHdbStreetName("TAMPINES STREET 21"));
        assertEquals("ANG MO KIO AVE 4", ApiService.normaliseHdbStreetName("ANG MO KIO AVENUE 4"));
        assertEquals("SERANGOON NTH AVE 4", ApiService.normaliseHdbStreetName("Serangoon North Avenue 4"));
        assertEquals("JLN BT MERAH", ApiService.normaliseHdbStreetName("JALAN BUKIT MERAH"));
        assertNull(ApiService.normaliseHdbStreetName(null));
    }

    @Test
    public void testHdbFlatTypeMapping() {
        assertEquals("2-ROOM", FairPricingService.hdbFlatType(1, 500));
        assertEquals("3-ROOM", FairPricingService.hdbFlatType(2, 700));
        assertEquals("4-ROOM", FairPricingService.hdbFlatType(3, 990));
        assertEquals("5-ROOM", FairPricingService.hdbFlatType(3, 1200));
        assertEquals("4-ROOM", FairPricingService.hdbFlatType(3, null));
        assertEquals("EXECUTIVE", FairPricingService.hdbFlatType(4, 1500));
    }

    @Test
    public void testComparablesAreCachedBetweenCalls() {
        when(apiService.getHDBRentalContractsByFlatType("520201", "3-ROOM")).thenReturn(List.of());
        service.estimate("HDB", 520201, 2, 700, 8, 2800);
        service.estimate("HDB", 520201, 2, 700, 12, 3000);
        verify(apiService, times(1)).getHDBRentalContractsByFlatType("520201", "3-ROOM");
    }

    @Test
    public void testParseYearMonth() {
        assertEquals(YearMonth.of(2024, 5), FairPricingService.parseYearMonth("2024-05"));
        assertEquals(YearMonth.of(2024, 5), FairPricingService.parseYearMonth("2024-05-15"));
        assertNull(FairPricingService.parseYearMonth("bad"));
    }

    // ---------------- data routing ----------------

    @Test
    public void testHdbEstimateUsesHdbDataset() {
        List<HDBRentalContract> contracts = new ArrayList<>();
        for (int r : new int[]{3400, 3500, 3600, 3700}) {
            HDBRentalContract c = new HDBRentalContract();
            c.setMonthlyRent(r);
            c.setRentApprovalDate("2024-06");
            c.setStreetName("SERANGOON NTH AVE 4");
            contracts.add(c);
        }
        when(apiService.getHDBRentalContractsByFlatType("550264", "4-ROOM")).thenReturn(contracts);

        FairPriceEstimate e = service.estimate("HDB", 550264, 3, 950, 10, 3500);

        assertTrue(e.isAvailable());
        assertEquals("HDB", e.getDataSource());
        assertTrue(e.getBasis().contains("SERANGOON NTH AVE 4"));
        assertEquals(Tier.EXCELLENT, e.getTier());
        verify(apiService, never()).getRentalContractsByProject(anyString(), anyInt(), anyString());
    }

    @Test
    public void testCondoFallsBackToRadiusWhenProjectHasTooFewComparables() {
        when(apiService.getProjectNameFromPostalCode("140085")).thenReturn("QUEENS");
        when(apiService.getRentalContractsByProject("QUEENS", 2, "1")).thenReturn(List.of());
        List<RentalContract> nearby = new ArrayList<>();
        for (int r : new int[]{2100, 2200, 2300}) {
            RentalContract c = new RentalContract();
            c.setRent(r);
            c.setAreaSqft("400-500");
            c.setLeaseDate("2024-03");
            nearby.add(c);
        }
        when(apiService.getRentalContractsNearPostalCode(eq("140085"), anyDouble(), eq(2), eq("1"))).thenReturn(nearby);

        FairPriceEstimate e = service.estimate("Condo", 140085, 1, 420, 12, 2200);

        assertTrue(e.isAvailable());
        assertEquals("URA", e.getDataSource());
        assertTrue(e.getBasis().contains("within"));
        assertEquals(3, e.getComparableCount());
    }

    @Test
    public void testExternalFailureReturnsUnavailableNotException() {
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString())).thenThrow(new RuntimeException("429 Too Many Requests: \"<html>...\""));
        FairPriceEstimate e = service.estimate("HDB", 520201, 1, 120, 8, 950);
        assertFalse(e.isAvailable());
        assertEquals(Tier.INSUFFICIENT_DATA, e.getTier());
        assertTrue(e.getMessage().contains("unavailable"));
        assertFalse(e.getMessage().contains("<html>"));
    }

    @Test
    public void testMissingPostalReturnsUnavailable() {
        FairPriceEstimate e = service.estimate("HDB", null, 3, null, null, null);
        assertFalse(e.isAvailable());
        verifyNoInteractions(apiService);
    }

    @Test
    public void testEstimateForListingReadsListingAttributes() {
        Listings l = new Listings();
        l.setListingID(4L);
        l.setType("HDB");
        l.setPostal(550264);
        l.setBeds(3);
        l.setSize(950);
        l.setFloor(6);
        l.setPrice(3600);
        when(listingsService.getListingById(4L)).thenReturn(Optional.of(l));
        when(apiService.getHDBRentalContractsByFlatType("550264", "4-ROOM")).thenReturn(List.of());

        Optional<FairPriceEstimate> e = service.estimateForListing(4L);
        assertTrue(e.isPresent());
        assertEquals(3600, e.get().getAskingPrice());
        assertFalse(e.get().isAvailable());

        assertTrue(service.estimateForListing(99L).isEmpty());
    }
}
