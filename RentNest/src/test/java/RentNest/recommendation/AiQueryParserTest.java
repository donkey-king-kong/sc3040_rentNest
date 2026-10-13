package RentNest.recommendation;

import RentNest.ai.AiProperties;
import RentNest.ai.AiUnavailableException;
import RentNest.ai.OpenRouterClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The model's reply is untrusted: these cover what survives validation, and that a failed
 * or disabled call still produces usable filters through the regex parser.
 */
class AiQueryParserTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final AtomicInteger calls = new AtomicInteger();

    private AiProperties properties() {
        AiProperties properties = new AiProperties();
        properties.setApiKey("test-key");
        return properties;
    }

    /** A client that answers with fixed JSON instead of calling OpenRouter. */
    private OpenRouterClient replying(AiProperties properties, String json) {
        return new OpenRouterClient(properties) {
            @Override public JsonNode completeJson(String model, String system, String user,
                                                   String schemaName, String schema, int maxTokens) {
                calls.incrementAndGet();
                try {
                    return MAPPER.readTree(json);
                } catch (Exception e) {
                    throw new AiUnavailableException("bad test fixture", e);
                }
            }
        };
    }

    private OpenRouterClient failing(AiProperties properties) {
        return new OpenRouterClient(properties) {
            @Override public JsonNode completeJson(String model, String system, String user,
                                                   String schemaName, String schema, int maxTokens) {
                calls.incrementAndGet();
                throw new AiUnavailableException("simulated outage");
            }
        };
    }

    private AiQueryParser parser(OpenRouterClient client, AiProperties properties) {
        return new AiQueryParser(client, properties, new RuleBasedQueryParser());
    }

    @Test void readsStructuredFiltersFromTheModelReply() {
        AiProperties properties = properties();
        var parsed = parser(replying(properties, """
                {"minPrice": 1500, "maxPrice": 3000, "minBeds": 2, "types": ["condo"],
                 "locations": ["jurong west", "boon lay"], "intent": "wants to be near food"}"""), properties)
                .parse("somewhere near NTU for two of us, walking distance to food, up to 3k");

        assertEquals(ParsedQuery.AI, parsed.source());
        assertEquals(1500, parsed.minPrice());
        assertEquals(3000, parsed.maxPrice());
        assertEquals(2, parsed.minBeds());
        assertEquals(List.of("condo"), parsed.types());
        assertEquals(List.of("jurong west", "boon lay"), parsed.locations());
        assertEquals("wants to be near food", parsed.intent());
    }

    @Test void discardsValuesOutsideTheWhitelistAndBounds() {
        AiProperties properties = properties();
        var parsed = parser(replying(properties, """
                {"minPrice": -5, "maxPrice": 99999999, "minBeds": 400,
                 "types": ["castle", "CONDOMINIUM", "condo"],
                 "locations": ["Tampines; DROP TABLE listings", "", "Tampines; DROP TABLE listings"], "intent": "x"}"""), properties)
                .parse("anything");

        assertNull(parsed.minPrice(), "negative budget must be dropped");
        assertNull(parsed.maxPrice(), "budget beyond the allowed ceiling must be dropped");
        assertNull(parsed.minBeds(), "implausible bedroom count must be dropped");
        assertEquals(List.of("condo"), parsed.types(), "unknown types must be dropped and duplicates collapsed");
        assertEquals(List.of("tampines drop table listings"), parsed.locations(),
                "punctuation must be stripped, blanks dropped and duplicates collapsed");
    }

    @Test void keepsTheBudgetCeilingWhenTheModelContradictsItself() {
        AiProperties properties = properties();
        var parsed = parser(replying(properties, """
                {"minPrice": 5000, "maxPrice": 2000, "minBeds": null, "types": [],
                 "locations": [], "intent": ""}"""), properties).parse("cheap place");

        assertNull(parsed.minPrice());
        assertEquals(2000, parsed.maxPrice());
    }

    @Test void fallsBackToRulesWhenTheModelIsUnavailable() {
        AiProperties properties = properties();
        var parsed = parser(failing(properties), properties).parse("2 bedroom condo in Tampines under $3,000");

        assertEquals(ParsedQuery.RULES, parsed.source());
        assertEquals(3000, parsed.maxPrice());
        assertEquals(2, parsed.minBeds());
        assertEquals(List.of("condo"), parsed.types());
        assertEquals(List.of("tampines"), parsed.locations());
        assertEquals(1, calls.get());
    }

    @Test void doesNotCallTheModelWhenDisabledOrWhenTheSearchIsEmpty() {
        AiProperties disabled = properties();
        disabled.getFilter().setEnabled(false);
        AiQueryParser parser = parser(failing(disabled), disabled);
        assertFalse(parser.isEnabled());
        assertEquals(ParsedQuery.RULES, parser.parse("hdb in bedok").source());

        AiProperties enabled = properties();
        assertEquals(ParsedQuery.RULES, parser(failing(enabled), enabled).parse("   ").source());
        assertEquals(0, calls.get());
    }

    @Test void repeatedSearchesReuseTheFirstParse() {
        AiProperties properties = properties();
        AiQueryParser parser = parser(replying(properties, """
                {"minPrice": null, "maxPrice": 2500, "minBeds": null, "types": ["hdb"],
                 "locations": ["bedok"], "intent": ""}"""), properties);

        parser.parse("hdb in bedok under 2.5k");
        parser.parse("HDB in Bedok under 2.5k");

        assertEquals(1, calls.get(), "the second, case-insensitively identical search must be served from cache");
    }
}
