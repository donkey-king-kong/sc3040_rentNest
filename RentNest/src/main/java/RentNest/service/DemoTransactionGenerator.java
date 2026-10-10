package RentNest.service;

import RentNest.service.FairPricingService.ComparableTransaction;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Simulated rental transactions for demonstrating the AI Fair-Pricing Model on
 * listings whose real comparable data is missing or too thin (for example a
 * postal code that is not a residential block).
 *
 * Used when {@code pricing.demo-data.enabled} is true (the default). Every estimate built
 * from this data is labelled with data source "DEMO" so it is never mistaken
 * for real market data. Nothing is written to the database.
 *
 * Rents start from a typical Singapore monthly rent for the property type and
 * bedroom count, are scaled by a rough location factor from the postal sector,
 * and get deterministic noise seeded by postal code and unit type, so the same
 * listing always sees the same comparables.
 */
public final class DemoTransactionGenerator {

    static final int COUNT = 24;
    static final double NOISE = 0.07;

    private DemoTransactionGenerator() {}

    /**
     * @param type       "HDB", "Condo" or "Landed"
     * @param unitKey    HDB flat type ("3-ROOM") or bedroom count for private property
     * @param postalCode six-digit postal code
     */
    public static List<ComparableTransaction> generate(String type, String unitKey, String postalCode) {
        boolean hdb = "HDB".equalsIgnoreCase(type);
        boolean landed = "Landed".equalsIgnoreCase(type);
        int beds = parseBeds(unitKey);

        double base = hdb ? hdbBaseRent(unitKey) : landed ? 9500 : condoBaseRent(beds);
        Double typicalSqft = hdb ? null : landed ? 3000.0 : condoTypicalSqft(beds);

        Random random = new Random((type + "|" + unitKey + "|" + postalCode).toLowerCase().hashCode());
        // Each property gets its own local level (+/-6%) so neighbouring listings differ.
        double local = base * locationFactor(postalCode) * (1 + (random.nextDouble() - 0.5) * 0.12);

        YearMonth now = YearMonth.now();
        List<ComparableTransaction> out = new ArrayList<>();
        for (int i = 0; i < COUNT; i++) {
            YearMonth period = now.minusMonths(i);
            // Rents drift up about 3% a year, so older contracts are a little cheaper.
            double trend = Math.pow(1.03, -i / 12.0);
            double noise = 1 + clamp(random.nextGaussian() * NOISE / 2, -NOISE * 1.5, NOISE * 1.5);
            Double area = null;
            double sizeFactor = 1.0;
            if (typicalSqft != null) {
                area = (double) Math.round(typicalSqft * (0.85 + random.nextDouble() * 0.3));
                sizeFactor = Math.sqrt(area / typicalSqft);
            }
            int rent = (int) (Math.round(local * trend * noise * sizeFactor / 10.0) * 10);
            out.add(new ComparableTransaction(rent, area, period));
        }
        return out;
    }

    static double hdbBaseRent(String flatType) {
        if (flatType == null) return 3000;
        return switch (flatType.toUpperCase()) {
            case "1-ROOM", "2-ROOM" -> 2300;
            case "3-ROOM" -> 3000;
            case "4-ROOM" -> 3600;
            case "5-ROOM" -> 4000;
            default -> 4500; // EXECUTIVE
        };
    }

    static double condoBaseRent(int beds) {
        if (beds <= 1) return 3400;
        if (beds == 2) return 4500;
        if (beds == 3) return 5800;
        return 7500 + (beds - 4) * 1200;
    }

    static double condoTypicalSqft(int beds) {
        if (beds <= 1) return 500;
        if (beds == 2) return 750;
        if (beds == 3) return 1100;
        return 1500 + (beds - 4) * 300;
    }

    /** Rough premium by postal sector: city centre and prime districts cost more. */
    static double locationFactor(String postalCode) {
        int sector;
        try {
            sector = Integer.parseInt(postalCode.substring(0, 2));
        } catch (RuntimeException e) {
            return 1.0;
        }
        if (sector <= 10) return 1.25;   // CBD, Marina, Orchard, River Valley, Harbourfront
        if (sector <= 30) return 1.12;   // city fringe: Queenstown, Bukit Timah, Novena, Newton
        return 1.0;
    }

    private static int parseBeds(String unitKey) {
        try {
            return Integer.parseInt(unitKey);
        } catch (RuntimeException e) {
            return 3;
        }
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
