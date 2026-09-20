package RentNest.recommendation;

import java.util.List;

public record RecommendationResponse(String mode, Filters filters, List<String> notices,
        int total, List<Item> recommendations) {
    public record Filters(String location, Integer minPrice, Integer maxPrice,
                          Integer minBeds, List<String> types) {}
    public record Item(Long listingID, String name, String location, String type,
                       Integer price, Integer beds, Integer bathroom, Integer size,
                       String listingpicture, int score, List<String> reasons, String summary, boolean demo) {}
}
