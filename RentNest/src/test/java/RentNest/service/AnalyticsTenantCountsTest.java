package RentNest.service;

import RentNest.repository.AnalyticsQueryRepository.RentalRow;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

class AnalyticsTenantCountsTest {
    private static final Instant NOW = Instant.parse("2026-10-07T00:00:00Z");

    private RentalRow rental(Long tenant, String status, long start, long end) {
        return new RentalRow(1L, status, tenant, Date.from(NOW.plusSeconds(start)),
                Date.from(NOW.plusSeconds(end)), null, null, null, null);
    }

    @Test
    void countsDistinctUsersWithCurrentTakingPrecedenceOverPast() {
        var counts = AnalyticsService.tenantCounts(List.of(
                rental(1L, " ACTIVE ", -100, 100), rental(1L, "active", -200, 200),
                rental(1L, "terminated", -300, -200),
                rental(2L, "active", -100, -1), rental(2L, "terminated", -200, -100),
                rental(3L, "terminated", -100, 0)), NOW);
        assertEquals(1, counts.current());
        assertEquals(2, counts.past());
    }

    @Test
    void respectsBoundariesAndExcludesPendingFutureAndUndatedTenancies() {
        var counts = AnalyticsService.tenantCounts(List.of(
                rental(1L, "active", 0, 100), rental(2L, "active", -100, 0),
                rental(3L, "pending", -100, -1), rental(4L, "active", 1, 100),
                rental(null, "active", -100, 100), rental(5L, "active", 100, -100),
                new RentalRow(1L, "terminated", 6L, null, null, null, null, null, null)), NOW);
        assertEquals(1, counts.current());
        assertEquals(1, counts.past());
    }

    @Test
    void usesRecordedTerminationInsteadOfOriginalLeaseExpiry() {
        var counts = AnalyticsService.tenantCounts(List.of(new RentalRow(1L, "terminated", 1L,
                Date.from(NOW.minusSeconds(100)), Date.from(NOW.plusSeconds(100)),
                null, null, Date.from(NOW.minusSeconds(1)), null)), NOW);
        assertEquals(0, counts.current());
        assertEquals(1, counts.past());
    }
}
