package RentNest.recommendation;

import RentNest.model.Listings;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * What a tenant's recently opened listings say about their preferences. Derived purely
 * from viewing behaviour, and used both by the deterministic similarity score and as
 * context for the re-ranker.
 */
public record TenantProfile(int views, Integer medianPrice, Integer minPrice, Integer maxPrice,
                            List<String> locations, List<String> types, List<Integer> beds) {

    public static final TenantProfile EMPTY =
            new TenantProfile(0, null, null, null, List.of(), List.of(), List.of());

    public static TenantProfile from(List<Listings> viewed) {
        if (viewed == null || viewed.isEmpty()) return EMPTY;
        List<Integer> prices = viewed.stream().map(Listings::getPrice)
                .filter(p -> p != null && p > 0).sorted().toList();
        Integer median = prices.isEmpty() ? null : prices.get(prices.size() / 2);
        return new TenantProfile(viewed.size(), median,
                prices.isEmpty() ? null : prices.getFirst(),
                prices.isEmpty() ? null : prices.getLast(),
                common(viewed.stream().map(l -> Normalize.text(l.getLocation())).toList()),
                common(viewed.stream().map(l -> Normalize.type(l.getType())).toList()),
                viewed.stream().map(Listings::getBeds).filter(java.util.Objects::nonNull).distinct().sorted().toList());
    }

    public boolean isEmpty() { return views == 0; }

    /** The three most frequent non-blank values, most frequent first. */
    private static List<String> common(List<String> values) {
        Map<String, Long> counts = values.stream().filter(v -> !v.isBlank())
                .collect(Collectors.groupingBy(v -> v, LinkedHashMap::new, Collectors.counting()));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3).map(Map.Entry::getKey).toList();
    }

    /** One line of context for the re-ranking prompt; empty when there is no history. */
    public String describe() {
        if (isEmpty()) return "";
        StringBuilder text = new StringBuilder("Tenant has opened " + views + " listing(s).");
        if (medianPrice != null)
            text.append(" Rents viewed: S$").append(minPrice).append("-S$").append(maxPrice)
                .append(", median S$").append(medianPrice).append('.');
        if (!locations.isEmpty()) text.append(" Locations viewed: ").append(String.join(", ", locations)).append('.');
        if (!types.isEmpty()) text.append(" Types viewed: ").append(String.join(", ", types)).append('.');
        if (!beds.isEmpty())
            text.append(" Bedroom counts viewed: ")
                .append(beds.stream().map(String::valueOf).collect(Collectors.joining(", "))).append('.');
        return text.toString();
    }
}
