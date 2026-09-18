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
        return new AnalyticsService(q, "SGD", "Asia/Singapore", "2026-09-17T02:26:00+08:00",
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
        var owner = s.ownerSummary(owner(), period);
        var listing = s.listingAnalytics(owner(), 1L, period);
        assertEquals(NOW, owner.asOf());
        assertEquals(NOW, listing.asOf());
        assertEquals(occupied ? 1L : 0L, owner.metrics().get("activeTenancyCount").value());
        assertEquals(new BigDecimal(occupied ? "100.0" : "0.0"), owner.metrics().get("occupancyRate").value());
        assertEquals(occupied ? "occupied" : "vacant", listing.metrics().get("occupancyStatus").value());
    }

    @Test void zeroPreviousOccupancyHasValidPositivePointChange() {
        assertPointChange("2026-04-16T00:00:00Z", TO, "50.0");
    }
    @Test void zeroCurrentOccupancyHasValidNegativePointChange() {
        assertPointChange("2026-03-17T00:00:00Z", FROM, "-50.0");
    }
    private void assertPointChange(String start, String end, String expected) {
        var row = new RentalRow(1L, "terminated", 2L, Date.from(Instant.parse(start)),
                Date.from(Instant.parse(end)), null, null, null, null);
        var s = service(List.of(row), 1L);
        var result = s.ownerSummary(owner(), s.parsePeriod(FROM, TO));
        assertEquals("available", result.metrics().get("averageOccupancyRateChange").availability());
        assertEquals(new BigDecimal(expected), result.metrics().get("averageOccupancyRateChange").value());
        assertEquals("percentage_points", result.metrics().get("averageOccupancyRateChange").unit());
        assertEquals("unavailable", result.metrics().get("recordedRentPaymentTotalChange").availability());
    }
    @Test void emptyHistoryIsZeroChangeButNoListingsIsUnavailable() {
        var s = service(List.of(), 1L);
        var result = s.ownerSummary(owner(), s.parsePeriod(FROM, TO));
        assertEquals(new BigDecimal("0.0"), result.metrics().get("averageOccupancyRateChange").value());
        var empty = service(List.of(), 0L);
        assertEquals("unavailable", empty.ownerSummary(owner(), empty.parsePeriod(FROM, TO))
                .metrics().get("averageOccupancyRateChange").availability());
    }
}
