package RentNest.ai;

import RentNest.recommendation.AiQueryParser;
import RentNest.recommendation.AiReranker;
import RentNest.recommendation.ParsedQuery;
import RentNest.recommendation.RecommendationResponse.Item;
import RentNest.recommendation.RuleBasedQueryParser;
import RentNest.recommendation.TenantProfile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Checks the real OpenRouter call: that the configured model slug exists, that it honours
 * the JSON schemas, and that its replies survive validation. This is the one test that
 * costs money, and the only one that proves the AI path actually works.
 *
 * <p>Skipped unless a key is available, so a normal build never calls out to the network
 * and no key is ever committed. Provide one either way:
 *
 * <pre>
 * # in src/main/resources/application.properties (gitignored)
 * rentnest.ai.api-key=sk-or-...
 *
 * # or just for one run
 * OPENROUTER_API_KEY=sk-or-... ./mvnw test -Dtest=OpenRouterLiveTest
 * </pre>
 */
@EnabledIf("hasApiKey")
class OpenRouterLiveTest {

    /** The key from the environment, falling back to the local application.properties. */
    static String apiKey() {
        String fromEnvironment = System.getenv("OPENROUTER_API_KEY");
        if (fromEnvironment != null && !fromEnvironment.isBlank()) return fromEnvironment.trim();

        Path local = Path.of("src/main/resources/application.properties");
        if (!Files.isReadable(local)) return "";
        Properties properties = new Properties();
        try (InputStream in = Files.newInputStream(local)) {
            properties.load(in);
        } catch (Exception e) {
            return "";
        }
        String configured = properties.getProperty("rentnest.ai.api-key", "").trim();
        // The checked-in example ships a placeholder; treat it as absent.
        return configured.startsWith("sk-or-") ? configured : "";
    }

    static boolean hasApiKey() {
        return !apiKey().isEmpty();
    }

    private AiProperties properties() {
        AiProperties properties = new AiProperties();
        properties.setApiKey(apiKey());
        return properties;
    }

    @Test void readsARealSearchPhraseIntoFilters() {
        AiProperties properties = properties();
        OpenRouterClient client = new OpenRouterClient(properties);
        assertTrue(client.isEnabled());

        ParsedQuery parsed = new AiQueryParser(client, properties, new RuleBasedQueryParser())
                .parse("two bedroom condo near NTU for my partner and me, max 3k, walking distance to food");

        System.out.println("Parsed filters: " + parsed);
        assertEquals(ParsedQuery.AI, parsed.source(),
                "the call fell back to regex: check the model slug and that the key has credit");
        assertEquals(3000, parsed.maxPrice(), "budget should be read as 3000");
        assertEquals(List.of("condo"), parsed.types());
        assertEquals(2, parsed.minBeds());
        assertFalse(parsed.locations().isEmpty(), "at least one town near NTU should be inferred");
    }

    @Test void returnsAPermutationOfTheListingsItWasGiven() {
        AiProperties properties = properties();
        List<Item> candidates = List.of(
                item(1, "Budget studio", "Woodlands", "HDB", 1400, 1, 420),
                item(2, "Tampines two-bedder", "Tampines", "Condo", 2900, 2, 780),
                item(3, "Tampines corner unit", "Tampines", "Condo", 3000, 3, 1100));

        var result = new AiReranker(new OpenRouterClient(properties), properties).rerank(
                candidates, "spacious condo in tampines", "wants room to work from home",
                new TenantProfile(2, 2900, 2800, 3000, List.of("tampines"), List.of("condo"), List.of(2)));

        System.out.println("Ranking: " + result.items().stream().map(Item::listingID).toList());
        System.out.println("Reasons: " + result.reasons());
        assertTrue(result.applied(), "the model did not return a usable ranking");
        assertEquals(List.of(1L, 2L, 3L), result.items().stream().map(Item::listingID).sorted().toList(),
                "re-ranking must return exactly the listings it was given");
    }

    private Item item(long id, String name, String location, String type, int price, int beds, int size) {
        return new Item(id, name, location, type, price, beds, 1, size, null, 50,
                List.of("Available listing"), "summary", "template", "", false);
    }
}
