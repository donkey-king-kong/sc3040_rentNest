package RentNest.recommendation;

import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static RentNest.recommendation.RecommendationResponse.Ai;
import static RentNest.recommendation.RecommendationResponse.Filters;
import static RentNest.recommendation.RecommendationResponse.Item;

/**
 * Recommendation pipeline. AI assists three stages and decides none of them outright:
 *
 * <ol>
 *   <li><b>Filter</b> – {@link AiQueryParser} turns the search phrase into structured
 *       filters, falling back to regex. The database, not the model, selects listings.</li>
 *   <li><b>Sort</b> – eligible listings are scored deterministically (rent 40, property
 *       type 25, location 25, bedrooms 10) against viewing history, then {@link AiReranker}
 *       re-orders only the leading candidates.</li>
 *   <li><b>Summarise</b> – {@link ListingSummaryService} supplies a cached per-listing
 *       summary, or the factual template until one has been generated.</li>
 * </ol>
 *
 * Each stage degrades independently: with no API key the whole pipeline still runs and
 * behaves exactly as the rule-based version did.
 */
@Service
public class RecommendationService {
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_QUERY_LENGTH = 300;
    private static final int MAX_HISTORY = 50;
    private static final List<String> TYPES = List.of("hdb", "condo", "landed");

    private final ListingsRepository repository;
    private final AiQueryParser queryParser;
    private final AiReranker reranker;
    private final ListingSummaryService summaries;

    public RecommendationService(ListingsRepository repository, AiQueryParser queryParser,
                                 AiReranker reranker, ListingSummaryService summaries) {
        this.repository = repository;
        this.queryParser = queryParser;
        this.reranker = reranker;
        this.summaries = summaries;
    }

    @Transactional(readOnly = true)
    public RecommendationResponse recommend(RecommendationRequest request, Long userId) {
        if (request == null) throw bad("A request body is required");
        String query = Normalize.text(request.query());
        if (query.length() > MAX_QUERY_LENGTH) throw bad("Search must be at most " + MAX_QUERY_LENGTH + " characters");
        if (request.viewedListingIds() != null && (request.viewedListingIds().size() > MAX_HISTORY
                || request.viewedListingIds().stream().anyMatch(id -> id == null || id <= 0)))
            throw bad("Provide at most " + MAX_HISTORY + " positive viewed listing IDs");
        int limit = request.limit() == null ? DEFAULT_LIMIT : request.limit();
        if (limit < 1 || limit > MAX_LIMIT) throw bad("Limit must be between 1 and " + MAX_LIMIT);

        List<String> requestedTypes = validateTypes(request.types());
        ParsedQuery parsed = queryParser.parse(query);

        // Values the tenant set on the form always win over anything read out of the phrase.
        Integer minPrice = request.minPrice() != null ? request.minPrice() : parsed.minPrice();
        Integer maxPrice = request.maxPrice() != null ? request.maxPrice() : parsed.maxPrice();
        Integer minBeds = request.minBeds() != null ? request.minBeds() : parsed.minBeds();
        List<String> types = requestedTypes != null ? requestedTypes : parsed.types();
        if ((minPrice != null && minPrice < 0) || (maxPrice != null && maxPrice < 0) || (minBeds != null && minBeds < 0))
            throw bad("Budget and bedrooms cannot be negative");
        if (minPrice != null && maxPrice != null && minPrice > maxPrice)
            throw bad("Minimum budget exceeds maximum budget");

        Filters filters = new Filters(parsed.locations(), minPrice, maxPrice, minBeds, List.copyOf(types));

        List<Listings> candidates = repository.findRecommendationCandidates(userId);
        Set<Long> historyIds = new HashSet<>(request.viewedListingIds() == null ? List.of() : request.viewedListingIds());
        List<Listings> history = candidates.stream().filter(l -> historyIds.contains(l.getListingID())).toList();
        TenantProfile profile = TenantProfile.from(history);

        Map<Long, Listings> matched = new LinkedHashMap<>();
        for (Listings listing : candidates) if (matches(listing, filters)) matched.put(listing.getListingID(), listing);

        List<Item> ranked = matched.values().stream()
                .map(listing -> score(listing, history, filters))
                .sorted(Comparator.comparingInt(Item::score).reversed()
                        .thenComparing(Item::price).thenComparing(Item::listingID))
                .toList();

        AiReranker.Result reranked = reranker.rerank(ranked, query, parsed.intent(), profile);
        // Market comparison and summaries are only worth computing for the page being returned.
        List<Item> page = enrich(reranked.items().stream().limit(limit).toList(),
                matched, candidates, reranked.reasons());

        boolean personalized = !history.isEmpty();
        return new RecommendationResponse(
                personalized ? "personalized" : "fallback",
                filters,
                notices(parsed, reranked.applied(), personalized, profile),
                ranked.size(),
                page,
                new Ai(filterMode(parsed), sortingMode(reranked.applied()), summaryMode(page)));
    }

    private List<String> validateTypes(List<String> requested) {
        if (requested == null) return null;
        if (requested.size() > TYPES.size()) throw bad("Choose HDB, Condo or Landed");
        List<String> types = new ArrayList<>();
        for (String value : requested) {
            String type = Normalize.type(value);
            if (!TYPES.contains(type)) throw bad("Choose HDB, Condo or Landed");
            if (!types.contains(type)) types.add(type);
        }
        return types;
    }

    private List<String> notices(ParsedQuery parsed, boolean reranked, boolean personalized, TenantProfile profile) {
        List<String> notices = new ArrayList<>();
        notices.add(ParsedQuery.AI.equals(parsed.source())
                ? "Your search was read by AI and turned into the filters shown. Scores measure similarity, not quality or probability."
                : "Filters were read from your search text by keyword rules. Scores measure similarity, not quality or probability.");
        if (!parsed.locations().isEmpty())
            notices.add("Matching listing name, location or postal code against any of: "
                    + String.join(", ", parsed.locations()));
        if (!parsed.intent().isBlank())
            notices.add("Preferences used for ordering only, not to exclude listings: " + parsed.intent());
        if (reranked) notices.add("AI re-ordered the top results; it cannot add or remove listings.");
        if (!personalized) notices.add("No eligible viewing history yet. Matching listings are ordered by lowest rent, then listing ID.");
        else notices.add(profile.describe());
        return List.copyOf(notices);
    }

    /** "off" when the feature is switched off, so a fallback is never reported as AI. */
    private String filterMode(ParsedQuery parsed) {
        if (!queryParser.isEnabled()) return "off";
        return ParsedQuery.AI.equals(parsed.source()) ? "ai" : "rules";
    }

    private String sortingMode(boolean reranked) {
        if (!reranker.isEnabled()) return "off";
        return reranked ? "ai" : "similarity";
    }

    private String summaryMode(List<Item> page) {
        if (!summaries.isEnabled()) return "off";
        return page.stream().anyMatch(item -> ListingSummaryService.Summary.AI.equals(item.summarySource()))
                ? "ai" : "pending";
    }

    /** Adds the market comparison, the cached summary and any AI re-ranking reason. */
    private List<Item> enrich(List<Item> page, Map<Long, Listings> matched,
                              List<Listings> pool, Map<Long, String> rerankReasons) {
        List<Item> enriched = new ArrayList<>(page.size());
        for (Item item : page) {
            Listings listing = matched.get(item.listingID());
            if (listing == null) { enriched.add(item); continue; }

            MarketStats market = MarketStats.forListing(listing, pool);
            ListingSummaryService.Summary summary = summaries.summaryFor(listing, market, item.summary());

            List<String> reasons = new ArrayList<>();
            String why = rerankReasons.get(item.listingID());
            if (why != null) reasons.add(why);
            for (String reason : item.reasons()) if (!reasons.contains(reason)) reasons.add(reason);

            enriched.add(new Item(item.listingID(), item.name(), item.location(), item.type(),
                    item.price(), item.beds(), item.bathroom(), item.size(), item.listingpicture(),
                    item.score(), List.copyOf(reasons), summary.text(), summary.source(),
                    market.note(item.price()), item.demo(), listing.getDescription()));
        }
        return List.copyOf(enriched);
    }

    private boolean matches(Listings l, Filters f) {
        if (l.getPrice() == null || l.getPrice() <= 0) return false;
        if (f.minPrice() != null && l.getPrice() < f.minPrice()) return false;
        if (f.maxPrice() != null && l.getPrice() > f.maxPrice()) return false;
        if (f.minBeds() != null && (l.getBeds() == null || l.getBeds() < f.minBeds())) return false;
        if (!f.types().isEmpty() && !f.types().contains(Normalize.type(l.getType()))) return false;
        String haystack = Normalize.text(l.getName()) + " " + Normalize.text(l.getLocation()) + " "
                + Objects.toString(l.getPostal(), "") + (l.isDemo() ? " demo" : "");
        // Places are alternatives; the words within one place all have to be present.
        return f.locations().isEmpty() || f.locations().stream()
                .anyMatch(place -> Arrays.stream(place.split("\\s+")).allMatch(haystack::contains));
    }

    /** The 40/25/25/10 similarity score against the tenant's viewing history. */
    private Item score(Listings l, List<Listings> history, Filters f) {
        double price = 0, type = 0, location = 0, beds = 0;
        for (Listings viewed : history) {
            if (viewed.getPrice() != null && viewed.getPrice() > 0)
                price += Math.max(0, 1 - Math.abs((double) l.getPrice() - viewed.getPrice()) / viewed.getPrice());
            if (!Normalize.text(l.getType()).isEmpty() && Normalize.type(l.getType()).equals(Normalize.type(viewed.getType()))) type++;
            if (!Normalize.text(l.getLocation()).isEmpty() && Normalize.text(l.getLocation()).equals(Normalize.text(viewed.getLocation()))) location++;
            if (l.getBeds() != null && l.getBeds().equals(viewed.getBeds())) beds++;
        }
        List<String> reasons = new ArrayList<>();
        if (f.minPrice() != null || f.maxPrice() != null) reasons.add("Within your budget");
        if (!f.types().isEmpty()) reasons.add("Matches your property type");
        if (f.minBeds() != null) reasons.add("Meets your bedroom requirement");
        if (!f.locations().isEmpty()) reasons.add("Matches your search location or listing name");
        int score = 0;
        if (!history.isEmpty()) {
            double n = history.size();
            score = (int) Math.round((40 * price + 25 * type + 25 * location + 10 * beds) / n);
            if (price / n >= 0.75) reasons.add("Similar rent to homes you viewed");
            if (type / n >= 0.5) reasons.add("Property type you often view");
            if (location / n >= 0.5) reasons.add("Location you often view");
            if (beds / n >= 0.5) reasons.add("Similar bedroom count to homes you viewed");
        }
        if (reasons.isEmpty()) reasons.add(history.isEmpty()
                ? "Available listing; lowest rent first"
                : "Available listing with limited similarity to your history");
        String summary = (Normalize.text(l.getType()).isEmpty() ? "Property" : l.getType())
                + (Normalize.text(l.getLocation()).isEmpty() ? "" : " in " + l.getLocation())
                + " · S$" + l.getPrice() + "/month"
                + (l.getBeds() == null ? "" : " · " + l.getBeds() + " bedroom(s)")
                + (l.getSize() == null ? "" : " · " + l.getSize() + " sq ft");
        return new Item(l.getListingID(), l.getName(), l.getLocation(), l.getType(), l.getPrice(),
                l.getBeds(), l.getBathroom(), l.getSize(), l.getListingpicture(), score,
                List.copyOf(reasons), summary, ListingSummaryService.Summary.TEMPLATE, "", l.isDemo());
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
