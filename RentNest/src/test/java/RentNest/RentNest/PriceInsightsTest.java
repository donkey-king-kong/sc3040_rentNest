package RentNest.RentNest;

import RentNest.model.api.RentalPrices;
import RentNest.service.ApiService;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PriceInsightsTest {

    private static List<Object[]> rows(Object... monthRentPairs) {
        List<Object[]> out = new ArrayList<>();
        for (int i = 0; i < monthRentPairs.length; i += 2) out.add(new Object[]{monthRentPairs[i], monthRentPairs[i + 1]});
        return out;
    }

    @Test
    public void testMonthlyMediansNewestFirst() {
        List<RentalPrices> out = ApiService.monthlyMedians(rows(
                "2026-08", 3000, "2026-09", 3600, "2026-09", 3700, "2026-09", 3750, "2026-08", 3100), 12);

        assertEquals(2, out.size());
        assertEquals("Sep 2026", out.get(0).getleaseDate());
        assertEquals(3700, out.get(0).getRentPrice());
        assertEquals("Aug 2026", out.get(1).getleaseDate());
        assertEquals(3050, out.get(1).getRentPrice()); // median of 3000 and 3100
    }

    @Test
    public void testMonthlyMediansKeepsOnlyRecentMonthsAndSkipsBadRows() {
        List<Object[]> data = new ArrayList<>();
        for (int m = 1; m <= 12; m++) data.add(new Object[]{String.format("2025-%02d", m), 2000 + m});
        data.add(new Object[]{"2026-01", 2500});
        data.add(new Object[]{null, 9999});
        data.add(new Object[]{"2026-02", 0});

        List<RentalPrices> out = ApiService.monthlyMedians(data, 12);

        assertEquals(12, out.size());
        assertEquals("Jan 2026", out.get(0).getleaseDate());
        assertEquals("Feb 2025", out.get(11).getleaseDate());
    }

    @Test
    public void testHdbFlatTypeFromListingText() {
        assertEquals("5-ROOM", ApiService.hdbFlatTypeForListing("Tampines HDB 5-Room", "", 4, 1184));
        assertEquals("4-ROOM", ApiService.hdbFlatTypeForListing("Yishun home", "Well-kept 4-room HDB", 3, 1001));
        assertEquals("EXECUTIVE", ApiService.hdbFlatTypeForListing("Executive maisonette", null, 4, 1500));
        assertEquals("3-ROOM", ApiService.hdbFlatTypeForListing("Cosy flat", "Near MRT", 2, 700));
    }

    @Test
    public void testHdbTownFromListingLocation() {
        assertEquals("TOA PAYOH", ApiService.hdbTownIn("Lorong 4 Toa Payoh"));
        assertEquals("ANG MO KIO", ApiService.hdbTownIn("Ang Mo Kio Avenue 10"));
        assertEquals("SENGKANG", ApiService.hdbTownIn("Sengkang"));
        assertNull(ApiService.hdbTownIn("Grange Road"));
        assertNull(ApiService.hdbTownIn(null));
    }
}
