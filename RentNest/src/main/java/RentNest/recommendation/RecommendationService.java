package RentNest.recommendation;

import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.regex.Pattern;
import static RentNest.recommendation.RecommendationResponse.*;

@Service
public class RecommendationService {
    private final ListingsRepository repository;
    private static final String MONEY = "(?:s\\$|\\$)?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?k?)";
    private static final Pattern MAX = Pattern.compile("\\b(?:under|below|up to|max(?:imum)?(?: budget)?|budget(?: of)?)\\s*" + MONEY);
    private static final Pattern MIN = Pattern.compile("\\b(?:over|above|at least|min(?:imum)?(?: budget)?)\\s*" + MONEY);
    private static final Pattern BEDS = Pattern.compile("\\b(\\d+)\\s*[- ]?\\s*(?:bed(?:room)?s?)\\b");
    private static final Pattern TYPE = Pattern.compile("\\b(hdb|condo(?:minium)?|landed)\\b");

    public RecommendationService(ListingsRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public RecommendationResponse recommend(RecommendationRequest request, Long userId) {
        if (request == null) throw bad("A request body is required");
        String query = text(request.query());
        if (query.length() > 300) throw bad("Search must be at most 300 characters");
        if (request.viewedListingIds() != null && (request.viewedListingIds().size() > 50
                || request.viewedListingIds().stream().anyMatch(id -> id == null || id <= 0)))
            throw bad("Provide at most 50 positive viewed listing IDs");
        int limit = request.limit() == null ? 50 : request.limit();
        if (limit < 1 || limit > 100) throw bad("Limit must be between 1 and 100");

        var maxMatcher = MAX.matcher(query);
        Integer max = request.maxPrice() != null ? request.maxPrice()
                : maxMatcher.find() ? money(maxMatcher.group(1)) : null;
        var minMatcher = MIN.matcher(query);
        Integer min = request.minPrice() != null ? request.minPrice()
                : minMatcher.find() ? money(minMatcher.group(1)) : null;
        var bedsMatcher = BEDS.matcher(query);
        Integer beds = request.minBeds() != null ? request.minBeds()
                : bedsMatcher.find() ? money(bedsMatcher.group(1)) : null;
        if ((min != null && min < 0) || (max != null && max < 0) || (beds != null && beds < 0))
            throw bad("Budget and bedrooms cannot be negative");
        if (min != null && max != null && min > max) throw bad("Minimum budget exceeds maximum budget");
        List<String> types = new ArrayList<>();
        if (request.types() != null) {
            if (request.types().size() > 3) throw bad("Choose HDB, Condo or Landed");
            for (String value : request.types()) {
                String type = normalizeType(value);
                if (!List.of("hdb", "condo", "landed").contains(type)) throw bad("Choose HDB, Condo or Landed");
                if (!types.contains(type)) types.add(type);
            }
        } else {
            var matcher = TYPE.matcher(query);
            while (matcher.find()) {
                String type = normalizeType(matcher.group(1));
                if (!types.contains(type)) types.add(type);
            }
        }
        // Explicit form values take precedence; remove parsed phrases from location text.
        String location = MAX.matcher(query).replaceAll(" ");
        location = MIN.matcher(location).replaceAll(" ");
        location = BEDS.matcher(location).replaceAll(" ");
        location = TYPE.matcher(location).replaceAll(" ");
        location = location.replaceAll("\\b(?:looking for|show me|find me|i want|per month|a month|monthly|rent|rental|please|with|in|at|a|an|and|or)\\b", " ")
                .replaceAll("\\s+", " ").trim();
        var filters = new Filters(location, min, max, beds, List.copyOf(types));
        List<String> notices = new ArrayList<>();
        notices.add("Rule-based recommendations. Scores measure similarity, not quality or probability.");
        if (!location.isEmpty()) notices.add("Remaining search text is matched against listing name, location or postal code: " + location);
        List<Listings> eligible = repository.findRecommendationCandidates(userId);
        Set<Long> historyIds = new HashSet<>(request.viewedListingIds() == null ? List.of() : request.viewedListingIds());
        List<Listings> history = eligible.stream().filter(l -> historyIds.contains(l.getListingID())).toList();
        List<Item> ranked = eligible.stream().filter(l -> matches(l, filters))
                .map(l -> score(l, history, filters))
                .sorted(Comparator.comparingInt(Item::score).reversed()
                        .thenComparing(Item::price).thenComparing(Item::listingID))
                .toList();
        if (history.isEmpty()) notices.add("No eligible viewing history yet. Matching listings are ordered by lowest rent, then listing ID.");
        return new RecommendationResponse(history.isEmpty() ? "fallback" : "personalized",
                filters, List.copyOf(notices), ranked.size(), ranked.stream().limit(limit).toList());
    }

    private boolean matches(Listings l, Filters f) {
        if (l.getPrice() == null || l.getPrice() <= 0) return false;
        if (f.minPrice() != null && l.getPrice() < f.minPrice()) return false;
        if (f.maxPrice() != null && l.getPrice() > f.maxPrice()) return false;
        if (f.minBeds() != null && (l.getBeds() == null || l.getBeds() < f.minBeds())) return false;
        if (!f.types().isEmpty() && !f.types().contains(normalizeType(l.getType()))) return false;
        String haystack = text(l.getName()) + " " + text(l.getLocation()) + " " + Objects.toString(l.getPostal(), "") + (l.isDemo() ? " demo" : "");
        return f.location().isBlank() || Arrays.stream(f.location().split("\\s+")).allMatch(haystack::contains);
    }

    private Item score(Listings l, List<Listings> history, Filters f) {
        double price = 0, type = 0, location = 0, beds = 0;
        for (Listings viewed : history) {
            if (viewed.getPrice() != null && viewed.getPrice() > 0)
                price += Math.max(0, 1 - Math.abs((double) l.getPrice() - viewed.getPrice()) / viewed.getPrice());
            if (!text(l.getType()).isEmpty() && normalizeType(l.getType()).equals(normalizeType(viewed.getType()))) type++;
            if (!text(l.getLocation()).isEmpty() && text(l.getLocation()).equals(text(viewed.getLocation()))) location++;
            if (l.getBeds() != null && l.getBeds().equals(viewed.getBeds())) beds++;
        }
        List<String> reasons = new ArrayList<>();
        if (f.minPrice() != null || f.maxPrice() != null) reasons.add("Within your budget");
        if (!f.types().isEmpty()) reasons.add("Matches your property type");
        if (f.minBeds() != null) reasons.add("Meets your bedroom requirement");
        if (!f.location().isBlank()) reasons.add("Matches your search location or listing name");
        int score = 0;
        if (!history.isEmpty()) {
            double n = history.size();
            score = (int) Math.round((40 * price + 25 * type + 25 * location + 10 * beds) / n);
            if (price / n >= 0.75) reasons.add("Similar rent to homes you viewed");
            if (type / n >= 0.5) reasons.add("Property type you often view");
            if (location / n >= 0.5) reasons.add("Location you often view");
            if (beds / n >= 0.5) reasons.add("Similar bedroom count to homes you viewed");
        }
        if (reasons.isEmpty()) reasons.add(history.isEmpty() ? "Available listing; lowest rent first" : "Available listing with limited similarity to your history");
        String summary = (text(l.getType()).isEmpty() ? "Property" : l.getType())
                + (text(l.getLocation()).isEmpty() ? "" : " in " + l.getLocation())
                + " · S$" + l.getPrice() + "/month"
                + (l.getBeds() == null ? "" : " · " + l.getBeds() + " bedroom(s)")
                + (l.getSize() == null ? "" : " · " + l.getSize() + " sq ft");
        return new Item(l.getListingID(), l.getName(), l.getLocation(), l.getType(), l.getPrice(),
                l.getBeds(), l.getBathroom(), l.getSize(), l.getListingpicture(), score, List.copyOf(reasons), summary, l.isDemo());
    }

    private static String text(String value) { return value == null ? "" : value.trim().toLowerCase(Locale.ROOT); }
    private static String normalizeType(String value) { return text(value).replace("condominium", "condo"); }
    private static Integer money(String value) {
        try {
            double amount = Double.parseDouble(value.replace(",", "").replace("k", "")) * (value.endsWith("k") ? 1000 : 1);
            if (!Double.isFinite(amount) || amount > Integer.MAX_VALUE || amount != Math.floor(amount)) throw bad("Invalid budget or bedroom count");
            return (int) amount;
        } catch (NumberFormatException e) { throw bad("Invalid budget or bedroom count"); }
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
