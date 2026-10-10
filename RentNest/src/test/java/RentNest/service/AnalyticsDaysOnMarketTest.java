package RentNest.service;

import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.AnalyticsQueryRepository;
import RentNest.repository.AnalyticsQueryRepository.RentalRow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsDaysOnMarketTest {
    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");
    private static final String PUBLISHED = "2026-09-01T00:00:00Z";
    private static final String ACCEPTED = "2026-09-11T00:00:00Z";
    private static final String FROM = "2026-09-01T00:00:00Z";
    private static final String TO = "2026-10-01T00:00:00Z";
    private static Date at(String iso) { return iso == null ? null : Date.from(Instant.parse(iso)); }

    private User actor() {
        User user = mock(User.class);
        when(user.getUserID()).thenReturn(42L);
        when(user.isAdmin()).thenReturn(true);
        return user;
    }

    private RentalRow row(long listing, String status, String published, String accepted) {
        // Lease starts long after acceptance; it must never be used for days on market.
        return new RentalRow(listing, status, 9L, at("2026-12-01T00:00:00Z"),
                at("2027-12-01T00:00:00Z"), at(PUBLISHED), at(accepted), null, at(published));
    }

    private AnalyticsService service(String published, List<RentalRow> rows) {
        AnalyticsQueryRepository q = mock(AnalyticsQueryRepository.class);
        Listings listing = mock(Listings.class);
        when(listing.getCreatedAt()).thenReturn(at(published));
        when(listing.getListingID()).thenReturn(1L);
        when(q.findListingOwnedBy(1L, 42L)).thenReturn(Optional.of(listing));
        when(q.findRentalRowsByListing(1L)).thenReturn(rows);
        when(q.findRentalRowsByOwner(42L)).thenReturn(rows);
        when(q.findAllRentalRows()).thenReturn(rows);
        when(q.countListingsByOwner(42L)).thenReturn(5L);
        when(q.findRatingSummaryForUser(42L)).thenReturn(new Object[]{null, 0L});
        return new AnalyticsService(q, "SGD", "Asia/Singapore", Clock.fixed(NOW, ZoneOffset.UTC));
    }

    static Stream<Arguments> dateCases() {
        return Stream.of(
                Arguments.of("accepted", PUBLISHED, ACCEPTED, "active", "10.0", null),
                Arguments.of("terminated", PUBLISHED, ACCEPTED, "terminated", "10.0", null),
                Arguments.of("same moment", PUBLISHED, PUBLISHED, "active", "0.0", null),
                Arguments.of("half day", PUBLISHED, "2026-09-01T12:00:00Z", "active", "0.5", null),
                Arguments.of("no publication", null, ACCEPTED, "active", null, "publication date was not recorded"),
                Arguments.of("accepted with no date", PUBLISHED, null, "active", null, "no recorded acceptance date"),
                Arguments.of("pending", PUBLISHED, null, "pending", null, "No rental offer has been accepted yet"),
                Arguments.of("reversed dates", PUBLISHED, "2026-08-01T00:00:00Z", "active", null, "earlier than"),
                Arguments.of("future acceptance", PUBLISHED, "2026-10-01T00:00:00Z", "active", null, "in the future"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("dateCases")
    void usesOnlyCompletedRecordedIntervals(String name, String published, String accepted, String status, String expected, String reason) {
        var s = service(published, List.of(row(1L, status, published, accepted)));
        var result = s.listingAnalytics(actor(), 1L, s.parsePeriod(FROM, TO)).metrics().get("daysOnMarket");
        assertEquals(expected == null ? "unavailable" : "available", result.availability());
        assertEquals(expected == null ? null : new BigDecimal(expected), result.value());
        if (reason != null) assertTrue(result.reason().contains(reason));
    }

    @Test void listingWithoutAnyOfferIsNotElapsedAge() {
        var s = service(PUBLISHED, List.of());
        var m = s.listingAnalytics(actor(), 1L, s.parsePeriod(FROM, TO)).metrics().get("daysOnMarket");
        assertNull(m.value());
        assertTrue(m.reason().contains("No rental offer"));
    }

    @Test void firstAcceptanceWinsAndIgnoresSelectedPeriod() {
        var s = service(PUBLISHED, List.of(row(1, "active", PUBLISHED, "2026-09-21T00:00:00Z"), row(1, "terminated", PUBLISHED, ACCEPTED)));
        var result = s.listingAnalytics(actor(), 1L, s.parsePeriod("2026-09-20T00:00:00Z", TO));
        assertEquals(new BigDecimal("10.0"), result.metrics().get("daysOnMarket").value());
        assertEquals(Instant.parse(ACCEPTED), result.listing().get("firstAcceptedAt"));
    }

    @Test void unknownHistoricalAcceptanceDoesNotBecomeALaterKnownDate() {
        var s = service(PUBLISHED, List.of(row(1, "terminated", PUBLISHED, null), row(1, "active", PUBLISHED, ACCEPTED)));
        var result = s.listingAnalytics(actor(), 1L, s.parsePeriod(FROM, TO));
        assertNull(result.metrics().get("daysOnMarket").value());
        assertNull(result.listing().get("firstAcceptedAt"));
    }

    @Test void ownerAndAdminAverageTheSameValidFirstAcceptancesWithinHalfOpenPeriod() {
        var rows = List.of(
                row(1, "terminated", PUBLISHED, ACCEPTED), // 10 days
                row(1, "active", PUBLISHED, "2026-09-21T00:00:00Z"), // duplicate listing excluded
                row(2, "active", "2026-08-26T00:00:00Z", FROM), // 6 days, exactly from included
                row(3, "active", PUBLISHED, TO), // exactly to excluded
                row(4, "active", null, ACCEPTED), // missing publication excluded
                row(5, "active", PUBLISHED, "2026-08-20T00:00:00Z")); // reversed excluded
        var s = service(PUBLISHED, rows);
        var period = s.parsePeriod(FROM, TO);
        assertEquals(new BigDecimal("8.0"), s.ownerSummary(actor(), period).series().get("monthlyAverageDaysOnMarket").points().getFirst().value());
        assertEquals(new BigDecimal("8.0"), s.platformSummary(actor(), period).series().get("monthlyAverageDaysOnMarket").points().getFirst().value());
    }

    @Test void laterAcceptanceDoesNotPullAnOldFirstAcceptanceIntoPeriod() {
        var s = service(PUBLISHED, List.of(row(1, "terminated", PUBLISHED, ACCEPTED), row(1, "active", PUBLISHED, "2026-09-21T00:00:00Z")));
        assertNull(s.ownerSummary(actor(), s.parsePeriod("2026-09-20T00:00:00Z", TO)).series().get("monthlyAverageDaysOnMarket").points().getFirst().value());
    }

    @Test void historicalAveragesUseValidFirstAcceptancesAndExcludeMissingOrInvalidDates() {
        String published = "2026-08-01T00:00:00Z";
        String accepted = "2026-08-11T00:00:00Z";
        var rows = List.of(
                row(1, "terminated", published, accepted), // 10 days before the former cutoff
                row(1, "active", published, "2026-08-21T00:00:00Z"), // later acceptance is ignored
                row(2, "active", null, accepted),
                row(3, "active", "2026-08-20T00:00:00Z", accepted),
                row(4, "terminated", published, null),
                row(4, "active", published, accepted)); // cannot determine this listing's first acceptance
        var s = service(published, rows);
        var period = s.parsePeriod("2026-08-01T00:00:00Z", "2026-09-01T00:00:00Z");
        for (var result : List.of(s.ownerSummary(actor(), period), s.platformSummary(actor(), period))) {
            var average = result.series().get("monthlyAverageDaysOnMarket");
            assertEquals("available", average.availability());
            assertEquals(new BigDecimal("10.0"), average.points().getFirst().value());
        }
    }
}
