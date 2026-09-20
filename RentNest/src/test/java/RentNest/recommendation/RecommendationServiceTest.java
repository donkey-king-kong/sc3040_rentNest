package RentNest.recommendation;

import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecommendationServiceTest {
    private ListingsRepository repository;
    private RecommendationService service;
    @BeforeEach void setup() {
        repository = mock(ListingsRepository.class);
        service = new RecommendationService(repository);
    }
    private Listings listing(long id, int price, String type, String location, int beds) {
        Listings l = new Listings();
        l.setListingID(id); l.setPrice(price); l.setType(type); l.setLocation(location); l.setBeds(beds);
        return l;
    }
    private RecommendationRequest request(String query, List<Long> history) {
        return new RecommendationRequest(query, null, null, null, null, history, null);
    }
    @Test void naturalLanguageAppliesHardConstraintsAndProducesFactualSummary() {
        when(repository.findRecommendationCandidates(7L)).thenReturn(List.of(
                listing(1, 2800, "Condo", "Tampines", 2), listing(2, 3100, "Condo", "Tampines", 2),
                listing(3, 2000, "HDB", "Tampines", 2), listing(4, 2400, "Condo", "Jurong", 2),
                listing(5, 2400, "Condo", "Tampines", 1)));
        var result = service.recommend(request("2 bedroom condo in Tampines under $3,000", List.of()), 7L);
        assertEquals(3000, result.filters().maxPrice());
        assertEquals("tampines", result.filters().location());
        assertEquals(1, result.total());
        assertEquals(1L, result.recommendations().getFirst().listingID());
        assertTrue(result.recommendations().getFirst().summary().contains("S$2800/month"));
        assertTrue(result.recommendations().getFirst().reasons().contains("Within your budget"));
    }
    @Test void fallbackIsStableAndMissingDataIsSafe() {
        Listings missing = new Listings(); missing.setListingID(8L);
        when(repository.findRecommendationCandidates(7L)).thenReturn(List.of(
                listing(3, 1000, null, null, 1), listing(2, 1000, "HDB", "Bedok", 1), missing));
        var result = service.recommend(request(null, List.of(999L)), 7L);
        assertEquals("fallback", result.mode());
        assertEquals(List.of(2L, 3L), result.recommendations().stream().map(RecommendationResponse.Item::listingID).toList());
        assertEquals(0, result.recommendations().getFirst().score());
    }
    @Test void browsingHistoryRanksSimilarListingsAndDeduplicatesViews() {
        when(repository.findRecommendationCandidates(7L)).thenReturn(List.of(
                listing(1, 2800, "Condo", "Tampines", 2), listing(2, 2700, "Condo", "Tampines", 2),
                listing(3, 900, "HDB", "Woodlands", 1)));
        var result = service.recommend(request("", List.of(1L, 1L, 999L)), 7L);
        assertEquals("personalized", result.mode());
        assertEquals(List.of(1L, 2L, 3L), result.recommendations().stream().map(RecommendationResponse.Item::listingID).toList());
        assertTrue(result.recommendations().get(1).score() > result.recommendations().get(2).score());
        assertTrue(result.recommendations().stream().allMatch(i -> i.score() >= 0 && i.score() <= 100));
        verify(repository).findRecommendationCandidates(7L);
    }
    @Test void explicitValuesOverrideParsedFiltersAndLimitDoesNotChangeTotal() {
        when(repository.findRecommendationCandidates(7L)).thenReturn(List.of(
                listing(1, 2500, "HDB", "Bedok", 2), listing(2, 2600, "HDB", "Bedok", 2)));
        var result = service.recommend(new RecommendationRequest("condo under 2k", null, 3000,
                null, List.of("HDB"), null, 1), 7L);
        assertEquals(2, result.total()); assertEquals(1, result.recommendations().size());
        assertEquals(3000, result.filters().maxPrice());
    }
    @Test void rejectsInvalidInputsBeforeReadingDatabase() {
        assertThrows(ResponseStatusException.class, () -> service.recommend(new RecommendationRequest("", 3000, 2000, null, null, null, null), 7L));
        assertThrows(ResponseStatusException.class, () -> service.recommend(new RecommendationRequest("", null, -1, null, null, null, null), 7L));
        assertThrows(ResponseStatusException.class, () -> service.recommend(new RecommendationRequest("", null, null, null, List.of("castle"), null, null), 7L));
        assertThrows(ResponseStatusException.class, () -> service.recommend(request("", Collections.nCopies(51, 1L)), 7L));
        assertThrows(ResponseStatusException.class, () -> service.recommend(request("x".repeat(301), null), 7L));
        assertThrows(ResponseStatusException.class, () -> service.recommend(request("under 99999999999999999999999", null), 7L));
        verifyNoInteractions(repository);
    }
    @Test void unmatchedQueryReturnsEmptyWithoutRelaxingConstraints() {
        when(repository.findRecommendationCandidates(7L)).thenReturn(List.of(listing(1, 3000, "HDB", "Bedok", 2)));
        var result = service.recommend(request("under 1k", null), 7L);
        assertEquals(0, result.total());
    }
}
