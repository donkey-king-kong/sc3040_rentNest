package RentNest.recommendation;

import java.util.List;

public record RecommendationResponse(String mode, Filters filters, List<String> notices,
        int total, List<Item> recommendations, Ai ai) {

    /** @param locations alternatives: a listing qualifies by matching any one of them. */
    public record Filters(List<String> locations, Integer minPrice, Integer maxPrice,
                          Integer minBeds, List<String> types) {}

    /**
     * Which path actually served each of the three AI features on this request, so the UI
     * can label what the tenant is looking at and a fallback is never passed off as AI.
     *
     * @param filter    {@code "ai"}, {@code "rules"} or {@code "off"}
     * @param sorting   {@code "ai"} when the model re-ranked, otherwise {@code "similarity"} or {@code "off"}
     * @param summaries {@code "ai"} when at least one card carries a generated summary,
     *                  {@code "pending"} while they are still being generated, else {@code "off"}
     */
    public record Ai(String filter, String sorting, String summaries) {}

    public record Item(Long listingID, String name, String location, String type,
                       Integer price, Integer beds, Integer bathroom, Integer size,
                       String listingpicture, int score, List<String> reasons, String summary,
                       String summarySource, String marketNote, boolean demo) {}
}
