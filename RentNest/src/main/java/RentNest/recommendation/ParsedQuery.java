package RentNest.recommendation;

import java.util.List;

/**
 * Structured search intent extracted from free-text search input, by either the model
 * (pillar 1) or the regex fallback.
 *
 * @param locations candidate places, matched as alternatives: a listing qualifies if it
 *                  matches any one of them. A list rather than a single string because a
 *                  phrase like "near NTU" or "in the north" covers several towns, and
 *                  collapsing those to one word matches nothing at all.
 * @param intent    a short, non-binding restatement of what the tenant is after beyond
 *                  the hard filters ("wants somewhere quiet, close to food"). It never
 *                  affects which listings are eligible; it is only a hint for the re-ranker.
 * @param source    {@code "ai"} or {@code "rules"}, reported back to the client so the
 *                  active path is visible in the UI and in testing.
 */
public record ParsedQuery(Integer minPrice, Integer maxPrice, Integer minBeds,
                          List<String> types, List<String> locations, String intent, String source) {

    public static final String AI = "ai";
    public static final String RULES = "rules";

    public static ParsedQuery empty(String source) {
        return new ParsedQuery(null, null, null, List.of(), List.of(), "", source);
    }
}
