package RentNest.recommendation;

import RentNest.ai.AiProperties;
import RentNest.ai.AiUnavailableException;
import RentNest.ai.OpenRouterClient;
import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Summaries are the one feature that could run a model call per listing per search, so
 * these cover the cache that stops it from doing so.
 */
class ListingSummaryServiceTest {
    private ListingsRepository repository;
    private final AtomicInteger calls = new AtomicInteger();

    @BeforeEach void setup() {
        repository = mock(ListingsRepository.class);
        calls.set(0);
    }

    private AiProperties properties() {
        AiProperties properties = new AiProperties();
        properties.setApiKey("test-key");
        return properties;
    }

    private OpenRouterClient replying(AiProperties properties, String text) {
        return new OpenRouterClient(properties) {
            @Override public String completeText(String model, String system, String user, int maxTokens) {
                calls.incrementAndGet();
                if (text == null) throw new AiUnavailableException("simulated outage");
                return text;
            }
        };
    }

    private ListingSummaryService service(AiProperties properties, OpenRouterClient client) {
        return new ListingSummaryService(client, properties, repository,
                (listingId, radius) -> AmenityLookup.Counts.NONE);
    }

    private Listings listing(long id, int price) {
        Listings l = new Listings();
        l.setListingID(id); l.setPrice(price); l.setType("Condo"); l.setLocation("Tampines");
        l.setBeds(2); l.setBathroom(1); l.setSize(700); l.setName("Home " + id);
        return l;
    }

    @Test void servesTheCachedSummaryWithoutCallingTheModel() {
        AiProperties properties = properties();
        ListingSummaryService service = service(properties, replying(properties, "should not be called"));
        Listings listing = listing(1, 2500);
        MarketStats market = MarketStats.UNKNOWN;
        listing.setAiSummary("Rented at S$2500, a two-bedroom condo of 700 sq ft.");
        listing.setAiSummaryKey(ListingSummaryService.cacheKey(listing, market));
        listing.setAiSummaryUpdatedAt(Instant.now());

        var summary = service.summaryFor(listing, market, "template text");

        assertEquals(ListingSummaryService.Summary.AI, summary.source());
        assertEquals("Rented at S$2500, a two-bedroom condo of 700 sq ft.", summary.text());
        assertEquals(0, calls.get());
        verify(repository, never()).updateAiSummary(any(), any(), any(), any());
    }

    @Test void returnsTheTemplateImmediatelyAndGeneratesInTheBackground() {
        AiProperties properties = properties();
        ListingSummaryService service = service(properties, replying(properties, "Generated  summary\ntext."));
        Listings listing = listing(2, 2500);

        var summary = service.summaryFor(listing, MarketStats.UNKNOWN, "template text");

        assertEquals(ListingSummaryService.Summary.TEMPLATE, summary.source(),
                "a search must never block on summary generation");
        assertEquals("template text", summary.text());
        verify(repository, timeout(3000)).updateAiSummary(eq(2L), eq("Generated summary text."),
                eq(ListingSummaryService.cacheKey(listing, MarketStats.UNKNOWN)), any(Instant.class));
    }

    @Test void aStaleSummaryIsNotServedAfterTheListingChanges() {
        AiProperties properties = properties();
        ListingSummaryService service = service(properties, replying(properties, "Fresh summary."));
        Listings listing = listing(3, 2500);
        listing.setAiSummary("Priced at S$2500.");
        listing.setAiSummaryKey(ListingSummaryService.cacheKey(listing, MarketStats.UNKNOWN));

        listing.setPrice(4000);
        var summary = service.summaryFor(listing, MarketStats.UNKNOWN, "template text");

        assertEquals(ListingSummaryService.Summary.TEMPLATE, summary.source());
        verify(repository, timeout(3000)).updateAiSummary(eq(3L), eq("Fresh summary."), any(), any(Instant.class));
    }

    @Test void aMarketShiftAloneInvalidatesTheCachedWording() {
        Listings listing = listing(4, 2500);
        MarketStats before = new MarketStats(2500, 5, "2-bedroom condos in Tampines");
        MarketStats after = new MarketStats(3200, 5, "2-bedroom condos in Tampines");

        assertNotEquals(ListingSummaryService.cacheKey(listing, before),
                ListingSummaryService.cacheKey(listing, after));
    }

    @Test void aFailedGenerationLeavesTheStoredSummaryAlone() {
        AiProperties properties = properties();
        ListingSummaryService service = service(properties, replying(properties, null));

        var summary = service.summaryFor(listing(5, 2500), MarketStats.UNKNOWN, "template text");

        assertEquals("template text", summary.text());
        verify(repository, after(500).never()).updateAiSummary(any(), any(), any(), any());
    }

    @Test void disabledSummariesNeverQueueWork() {
        AiProperties properties = properties();
        properties.getSummary().setEnabled(false);
        ListingSummaryService service = service(properties, replying(properties, "should not be called"));

        var summary = service.summaryFor(listing(6, 2500), MarketStats.UNKNOWN, "template text");

        assertFalse(service.isEnabled());
        assertEquals(ListingSummaryService.Summary.TEMPLATE, summary.source());
        assertEquals(0, calls.get());
    }

    @Test void marketStatsWidenTheCohortUntilThereAreEnoughComparables() {
        Listings subject = listing(1, 2000);
        // Only one other 2-bed condo in Tampines, so the bedroom-specific cohort is too small.
        Listings sameEverything = listing(2, 3000);
        Listings oneBedSameTown = listing(3, 2800); oneBedSameTown.setBeds(1);
        Listings threeBedSameTown = listing(4, 3400); threeBedSameTown.setBeds(3);

        var stats = MarketStats.forListing(subject,
                List.of(subject, sameEverything, oneBedSameTown, threeBedSameTown));

        assertEquals("condos in Tampines", stats.cohort());
        assertEquals(3, stats.sampleSize());
        assertTrue(stats.note(2000).contains("below the median for condos in Tampines"), stats.note(2000));
    }

    @Test void tooFewComparablesProduceNoMarketClaim() {
        Listings subject = listing(1, 2000);
        assertFalse(MarketStats.forListing(subject, List.of(subject, listing(2, 3000))).isKnown());
        assertEquals("", MarketStats.forListing(subject, List.of(subject)).note(2000));
    }
}
