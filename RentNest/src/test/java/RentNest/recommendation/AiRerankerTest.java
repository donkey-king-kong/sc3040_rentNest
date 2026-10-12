package RentNest.recommendation;

import RentNest.ai.AiProperties;
import RentNest.ai.AiUnavailableException;
import RentNest.ai.OpenRouterClient;
import RentNest.recommendation.RecommendationResponse.Item;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The re-ranker may reorder results and nothing else. These pin down that a reply is
 * always forced back into a permutation of the listings it was given.
 */
class AiRerankerTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private AiProperties properties() {
        AiProperties properties = new AiProperties();
        properties.setApiKey("test-key");
        return properties;
    }

    private OpenRouterClient replying(AiProperties properties, String json) {
        return new OpenRouterClient(properties) {
            @Override public JsonNode completeJson(String model, String system, String user,
                                                   String schemaName, String schema, int maxTokens) {
                try {
                    return MAPPER.readTree(json);
                } catch (Exception e) {
                    throw new AiUnavailableException("bad test fixture", e);
                }
            }
        };
    }

    private Item item(long id, int score) {
        return new Item(id, "Home " + id, "Tampines", "Condo", 2000 + (int) id, 2, 1, 700,
                null, score, List.of("Available listing"), "summary", "template", "", false);
    }

    private List<Long> ids(List<Item> items) {
        return items.stream().map(Item::listingID).toList();
    }

    private static final TenantProfile HISTORY =
            new TenantProfile(2, 2500, 2000, 3000, List.of("tampines"), List.of("condo"), List.of(2));

    @Test void appliesTheModelOrdering() {
        AiProperties properties = properties();
        var result = new AiReranker(replying(properties, """
                {"ranking": [{"id": 3, "why": "largest unit at this rent"},
                             {"id": 1, "why": "closest to the rents you view"},
                             {"id": 2, "why": "similar layout nearby"}]}"""), properties)
                .rerank(List.of(item(1, 90), item(2, 80), item(3, 70)), "condo in tampines", "", HISTORY);

        assertTrue(result.applied());
        assertEquals(List.of(3L, 1L, 2L), ids(result.items()));
        assertEquals("largest unit at this rent", result.reasons().get(3L));
    }

    @Test void dropsInventedIdsAndKeepsOmittedOnesInDeterministicOrder() {
        AiProperties properties = properties();
        var result = new AiReranker(replying(properties, """
                {"ranking": [{"id": 999, "why": "hallucinated listing"},
                             {"id": 3, "why": "good value"},
                             {"id": 3, "why": "duplicate entry"}]}"""), properties)
                .rerank(List.of(item(1, 90), item(2, 80), item(3, 70)), "condo", "", HISTORY);

        assertTrue(result.applied());
        assertEquals(List.of(3L, 1L, 2L), ids(result.items()),
                "unknown IDs are dropped, duplicates collapse, and the rest keep their score order");
        assertFalse(result.reasons().containsKey(999L));
        assertEquals(3, result.items().size(), "re-ranking must never change how many listings are returned");
    }

    @Test void onlyTheLeadingCandidatesAreSentAndTheTailIsUntouched() {
        AiProperties properties = properties();
        properties.getSorting().setCandidates(2);
        var result = new AiReranker(replying(properties, """
                {"ranking": [{"id": 2, "why": "better fit"}, {"id": 1, "why": "also close"}]}"""), properties)
                .rerank(List.of(item(1, 90), item(2, 80), item(3, 70), item(4, 60)), "condo", "", HISTORY);

        assertEquals(List.of(2L, 1L, 3L, 4L), ids(result.items()));
    }

    @Test void keepsDeterministicOrderWhenTheModelFailsOrReturnsNothingUsable() {
        AiProperties properties = properties();
        List<Item> ranked = List.of(item(1, 90), item(2, 80));

        var empty = new AiReranker(replying(properties, "{\"ranking\": []}"), properties)
                .rerank(ranked, "condo", "", HISTORY);
        assertFalse(empty.applied());
        assertEquals(List.of(1L, 2L), ids(empty.items()));

        OpenRouterClient broken = new OpenRouterClient(properties) {
            @Override public JsonNode completeJson(String model, String system, String user,
                                                   String schemaName, String schema, int maxTokens) {
                throw new AiUnavailableException("simulated outage");
            }
        };
        var failed = new AiReranker(broken, properties).rerank(ranked, "condo", "", HISTORY);
        assertFalse(failed.applied());
        assertEquals(List.of(1L, 2L), ids(failed.items()));
    }

    @Test void skipsTheCallWithNothingToRankOn() {
        AiProperties properties = properties();
        OpenRouterClient neverCalled = new OpenRouterClient(properties) {
            @Override public JsonNode completeJson(String model, String system, String user,
                                                   String schemaName, String schema, int maxTokens) {
                return fail("no search text and no history: the model must not be called");
            }
        };
        AiReranker reranker = new AiReranker(neverCalled, properties);

        assertFalse(reranker.rerank(List.of(item(1, 0), item(2, 0)), "", "", TenantProfile.EMPTY).applied());
        assertFalse(reranker.rerank(List.of(item(1, 0)), "condo", "", HISTORY).applied(),
                "a single result has no ordering to change");
    }

    @Test void disabledSortingLeavesTheOrderAlone() {
        AiProperties properties = properties();
        properties.getSorting().setEnabled(false);
        var reranker = new AiReranker(replying(properties, """
                {"ranking": [{"id": 2, "why": "better"}, {"id": 1, "why": "worse"}]}"""), properties);

        assertFalse(reranker.isEnabled());
        assertEquals(List.of(1L, 2L), ids(reranker.rerank(List.of(item(1, 90), item(2, 80)), "condo", "", HISTORY).items()));
    }
}
