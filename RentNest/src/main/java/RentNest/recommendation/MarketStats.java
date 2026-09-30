package RentNest.recommendation;

import RentNest.model.Listings;

import java.util.List;
import java.util.function.Predicate;

/**
 * How a listing's rent compares with comparable listings on the platform.
 *
 * <p>Computed in memory from the candidate set that has already been loaded, so it costs
 * no extra query and no model call. It gives every card a factual "price relative to
 * market" line even when AI is switched off, and it grounds the AI summary prompt so the
 * model states a real comparison instead of inventing one.
 */
public record MarketStats(Integer median, int sampleSize, String cohort) {

    public static final MarketStats UNKNOWN = new MarketStats(null, 0, "");

    /** Comparables must number at least this many before a comparison is worth stating. */
    private static final int MIN_SAMPLE = 3;
    /** Rents within this fraction of the median are reported as in line with it. */
    private static final double IN_LINE = 0.03;

    public boolean isKnown() { return median != null && median > 0; }

    /**
     * Finds the narrowest cohort with enough comparables: same town, type and bedroom
     * count first, widening until one qualifies.
     */
    public static MarketStats forListing(Listings listing, List<Listings> pool) {
        String location = Normalize.text(listing.getLocation());
        String type = Normalize.type(listing.getType());
        Integer beds = listing.getBeds();

        String bedLabel = beds == null ? "" : beds + "-bedroom ";
        String typeLabel = type.isEmpty() ? "homes" : type + "s";
        String placeLabel = location.isEmpty() ? "on RentNest" : "in " + listing.getLocation().trim();

        record Tier(boolean usable, Predicate<Listings> match, String label) {}
        List<Tier> tiers = List.of(
                new Tier(!location.isEmpty() && !type.isEmpty() && beds != null,
                        l -> sameLocation(l, location) && sameType(l, type) && beds.equals(l.getBeds()),
                        bedLabel + typeLabel + " " + placeLabel),
                new Tier(!location.isEmpty() && !type.isEmpty(),
                        l -> sameLocation(l, location) && sameType(l, type),
                        typeLabel + " " + placeLabel),
                new Tier(!location.isEmpty(),
                        l -> sameLocation(l, location),
                        "homes " + placeLabel),
                new Tier(!type.isEmpty() && beds != null,
                        l -> sameType(l, type) && beds.equals(l.getBeds()),
                        bedLabel + typeLabel + " on RentNest"),
                new Tier(!type.isEmpty(), l -> sameType(l, type), typeLabel + " on RentNest"));

        for (Tier tier : tiers) {
            if (!tier.usable()) continue;
            List<Integer> prices = pool.stream()
                    .filter(l -> !l.getListingID().equals(listing.getListingID()))
                    .filter(l -> l.getPrice() != null && l.getPrice() > 0)
                    .filter(tier.match())
                    .map(Listings::getPrice).sorted().toList();
            if (prices.size() >= MIN_SAMPLE)
                return new MarketStats(prices.get(prices.size() / 2), prices.size(), tier.label());
        }
        return UNKNOWN;
    }

    /** A plain sentence for the listing card, or empty when there are too few comparables. */
    public String note(Integer price) {
        if (!isKnown() || price == null || price <= 0) return "";
        double difference = (price - (double) median) / median;
        String comparison;
        if (Math.abs(difference) <= IN_LINE) comparison = "In line with the median for ";
        else comparison = Math.round(Math.abs(difference) * 100) + "% "
                + (difference < 0 ? "below" : "above") + " the median for ";
        return comparison + cohort + " (" + sampleSize + " comparable listing"
                + (sampleSize == 1 ? "" : "s") + ", median S$" + median + ")";
    }

    private static boolean sameLocation(Listings listing, String location) {
        return Normalize.text(listing.getLocation()).equals(location);
    }

    private static boolean sameType(Listings listing, String type) {
        return Normalize.type(listing.getType()).equals(type);
    }
}
