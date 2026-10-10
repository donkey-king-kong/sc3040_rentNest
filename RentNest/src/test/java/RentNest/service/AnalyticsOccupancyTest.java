package RentNest.service;

import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.AnalyticsQueryRepository;
import RentNest.repository.AnalyticsQueryRepository.RentalRow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsOccupancyTest {
    private static final Instant NOW = Instant.parse("2026-09-18T12:00:00Z");
    private static final String FROM = "2026-04-01T00:00:00Z";
    private static final String TO = "2026-05-01T00:00:00Z";

    private AnalyticsService service(List<RentalRow> rentals, long listingCount) {
        AnalyticsQueryRepository q = mock(AnalyticsQueryRepository.class);
        when(q.countListingsByOwner(42L)).thenReturn(listingCount);
        when(q.findRentalRowsByOwner(42L)).thenReturn(rentals);
        when(q.findRentalRowsByListing(1L)).thenReturn(rentals);
        when(q.findRatingSummaryForUser(42L)).thenReturn(new Object[]{null, 0L});
        Listings listing = mock(Listings.class);
        when(listing.getListingID()).thenReturn(1L);
        when(q.findListingOwnedBy(1L, 42L)).thenReturn(Optional.of(listing));
        return new AnalyticsService(q, "SGD", "Asia/Singapore",
                Clock.fixed(NOW, ZoneOffset.UTC));
    }
    private User owner() {
        User user = mock(User.class);
        when(user.getUserID()).thenReturn(42L);
        return user;
    }
    private static Date at(Long seconds) { return seconds == null ? null : Date.from(NOW.plusSeconds(seconds)); }

    static Stream<Arguments> occupancyCases() {
        return Stream.of(
                Arguments.of("expired", "active", -100L, -1L, null, false),
                Arguments.of("future", "active", 1L, 100L, null, false),
                Arguments.of("starts now", "active", 0L, 100L, null, true),
                Arguments.of("ends now", "active", -100L, 0L, null, false),
                Arguments.of("currently occupied", " ACTIVE ", -100L, 100L, null, true),
                Arguments.of("pending", "pending", -100L, 100L, null, false),
                Arguments.of("terminated", "terminated", -100L, 100L, -1L, false),
                Arguments.of("recorded end reached", "active", -100L, 100L, 0L, false),
                Arguments.of("missing start", "active", null, 100L, null, false),
                Arguments.of("missing end", "active", -100L, null, null, false));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("occupancyCases")
    void currentOccupancyUsesDatesAndSameAsOfForOwnerAndListing(String label, String status,
            Long start, Long end, Long terminated, boolean occupied) {
        var row = new RentalRow(1L, status, 2L, at(start), at(end), null, null, at(terminated), null);
        // Duplicate records must not count a listing twice.
        var s = service(List.of(row, row), 1L);
        var period = s.parsePeriod(FROM, TO);
        var owner = s.getOwnerAnalytics(owner(), period);
        var listing = s.getOwnerPropertyListingAnalytics(owner(), 1L, period);
        assertEquals(NOW, owner.asOf());
        assertEquals(NOW, listing.asOf());
        assertEquals(occupied ? 1L : 0L, owner.metrics().get("activeTenancyCount").value());
        assertFalse(owner.metrics().containsKey("occupancyRate"));
        assertEquals(occupied ? "occupied" : "vacant", listing.metrics().get("occupancyStatus").value());
    }

    @Test void propertyAverageAndMonthlyOccupancyRetainOverlapCalculation() {
        var row = new RentalRow(1L, "terminated", 2L, Date.from(Instant.parse("2026-04-16T00:00:00Z")),
                Date.from(Instant.parse(TO)), null, null, null, null);
        var s = service(List.of(row), 1L);
        var period = s.parsePeriod(FROM, TO);
        var result = s.getOwnerPropertyListingAnalytics(owner(), 1L, period);
        assertEquals(new BigDecimal("50.0"), result.metrics().get("averageOccupancyRate").value());
        var monthly = s.getOwnerAnalytics(owner(), period).series().get("monthlyOccupancyRate").points();
        // The April bucket ends at midnight Singapore time, eight hours before TO.
        assertEquals(new BigDecimal("49.4"), monthly.getFirst().value());
        assertFalse(result.metrics().containsKey("averageOccupancyRateChange"));
    }

    @Test void emptyHistoryKeepsZeroMonthlyOccupancyButNoListingsIsUnavailable() {
        var s = service(List.of(), 1L);
        var result = s.getOwnerAnalytics(owner(), s.parsePeriod(FROM, TO));
        assertEquals(new BigDecimal("0.0"), result.series().get("monthlyOccupancyRate").points().getFirst().value());
        var empty = service(List.of(), 0L);
        assertEquals("unavailable", empty.getOwnerAnalytics(owner(), empty.parsePeriod(FROM, TO))
                .series().get("monthlyOccupancyRate").availability());
    }
}
