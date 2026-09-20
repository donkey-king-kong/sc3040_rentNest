package RentNest.recommendation;

import java.util.List;

public record RecommendationRequest(String query, Integer minPrice, Integer maxPrice,
        Integer minBeds, List<String> types, List<Long> viewedListingIds, Integer limit) {}
