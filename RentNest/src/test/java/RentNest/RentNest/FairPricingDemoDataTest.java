package RentNest.RentNest;

import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.HDBRentalContract;
import RentNest.service.ApiService;
import RentNest.service.DemoTransactionGenerator;
import RentNest.service.FairPricingService;
import RentNest.service.FairPricingService.ComparableTransaction;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class FairPricingDemoDataTest {

    @Mock
    private ApiService apiService;

    @Mock
    private ListingsService listingsService;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private static List<HDBRentalContract> hdbContracts(int... rents) {
        List<HDBRentalContract> out = new ArrayList<>();
        for (int r : rents) {
            HDBRentalContract c = new HDBRentalContract();
            c.setMonthlyRent(r);
            c.setRentApprovalDate("2026-06");
            c.setStreetName("TAMPINES ST 21");
            out.add(c);
        }
        return out;
    }

    private static double median(List<ComparableTransaction> comps) {
        List<Integer> rents = comps.stream().map(ComparableTransaction::rent).sorted().toList();
        return rents.get(rents.size() / 2);
    }

    // ---------------- generator ----------------

    @Test
    public void testGeneratorIsDeterministic() {
        assertEquals(DemoTransactionGenerator.generate("HDB", "3-ROOM", "520201"),
                DemoTransactionGenerator.generate("HDB", "3-ROOM", "520201"));
    }

    @Test
    public void testGeneratorProducesPlausibleHdbRents() {
        List<ComparableTransaction> comps = DemoTransactionGenerator.generate("HDB", "3-ROOM", "520201");
        assertEquals(24, comps.size());
        comps.forEach(c -> {
            assertTrue(c.rent() > 2200 && c.rent() < 4000, "rent " + c.rent());
            assertNull(c.areaSqft());
            assertNotNull(c.period());
        });
    }

    @Test
    public void testGeneratorGivesCondoSizesAndLargerUnitsCostMore() {
        List<ComparableTransaction> oneBed = DemoTransactionGenerator.generate("Condo", "1", "650123");
        List<ComparableTransaction> threeBed = DemoTransactionGenerator.generate("Condo", "3", "650123");
        oneBed.forEach(c -> assertNotNull(c.areaSqft()));
        assertTrue(median(threeBed) > median(oneBed));
    }

    @Test
    public void testCentralLocationCostsMore() {
        double central = median(DemoTransactionGenerator.generate("Condo", "2", "088888"));
        double heartland = median(DemoTransactionGenerator.generate("Condo", "2", "650123"));
        assertTrue(central > heartland);
    }

    // ---------------- service fallback ----------------

    @Test
    public void testDisabledKeepsInsufficientData() {
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString())).thenReturn(List.of());
        FairPricingService service = new FairPricingService(apiService, listingsService, false);

        FairPriceEstimate e = service.estimate("HDB", 520201, 2, 700, 8, 3000);

        assertFalse(e.isAvailable());
    }

    @Test
    public void testEnabledUsesDemoDataWhenNoComparables() {
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString())).thenReturn(List.of());
        FairPricingService service = new FairPricingService(apiService, listingsService, true);

        FairPriceEstimate e = service.estimate("HDB", 520201, 2, 700, 8, 3000);

        assertTrue(e.isAvailable());
        assertEquals("DEMO", e.getDataSource());
        assertTrue(e.getBasis().contains("demo data"));
        assertNotNull(e.getTier());
    }

    @Test
    public void testEnabledUsesDemoDataWhenMarketDataFails() {
        when(apiService.getProjectNameFromPostalCode(anyString())).thenThrow(new RuntimeException("401 Unauthorized: bad key"));
        FairPricingService service = new FairPricingService(apiService, listingsService, true);

        FairPriceEstimate e = service.estimate("Condo", 650123, 2, 800, 12, 4600);

        assertTrue(e.isAvailable());
        assertEquals("DEMO", e.getDataSource());
    }

    @Test
    public void testEnabledKeepsRealDataWhenEnough() {
        when(apiService.getHDBRentalContractsByFlatType(anyString(), anyString()))
                .thenReturn(hdbContracts(2800, 2900, 3000, 3100));
        FairPricingService service = new FairPricingService(apiService, listingsService, true);

        FairPriceEstimate e = service.estimate("HDB", 520201, 2, 700, 8, 3000);

        assertTrue(e.isAvailable());
        assertEquals("HDB", e.getDataSource());
    }
}
