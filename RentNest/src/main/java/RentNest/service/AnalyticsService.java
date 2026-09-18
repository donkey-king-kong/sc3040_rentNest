package RentNest.service;

import RentNest.dto.analytics.AnalyticsPeriod;
import RentNest.dto.analytics.AnalyticsResponse;
import RentNest.dto.analytics.Metric;
import RentNest.dto.analytics.Series;
import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.AnalyticsQueryRepository;
import RentNest.repository.AnalyticsQueryRepository.PaymentRow;
import RentNest.repository.AnalyticsQueryRepository.RentalRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Function;

import static RentNest.dto.analytics.Metric.PERIOD;
import static RentNest.dto.analytics.Metric.SNAPSHOT;

/**
 * Tier 1 analytics: metrics derived only from data the app already stores.
 * Metric definitions live here once and are shared by the owner, listing and platform scopes.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    static final long MAX_PERIOD_DAYS = 366;

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_TERMINATED = "terminated";
    private static final Set<String> ACCEPTED_STATUSES = Set.of(STATUS_ACTIVE, STATUS_TERMINATED);

    private static final String COUNT = "count";
    private static final String PERCENT = "percent";
    private static final String MONTHS = "months";
    private static final String PERCENTAGE_POINTS = "percentage_points";

    private static final String NOT_TRACKED = "Not tracked yet: requires event instrumentation that has not been enabled.";

    // Contracted/actual tenancy length buckets, lower bound inclusive, in months
    private static final int[] TENANCY_BUCKET_BOUNDS = {3, 6, 12, 24};
    private static final String[] TENANCY_BUCKET_LABELS = {"<3 months", "3-6 months", "6-12 months", "12-24 months", ">=24 months"};

    private final AnalyticsQueryRepository queries;
    private final String currency;
    private final ZoneId zone;
    // Lifecycle timestamps (created, accepted, terminated) are only recorded from this moment on
    private final Instant trackingStart;
    private final Clock clock;

    @Autowired
    public AnalyticsService(
            AnalyticsQueryRepository queries,
            @Value("${analytics.currency:SGD}") String currency,
            @Value("${analytics.time-zone:Asia/Singapore}") String timeZone,
            @Value("${analytics.lifecycle-tracking-start:2026-09-17T02:26:00+08:00}") String lifecycleTrackingStart) {
        this(queries, currency, timeZone, lifecycleTrackingStart, Clock.systemUTC());
    }

    AnalyticsService(AnalyticsQueryRepository queries, String currency, String timeZone,
                     String lifecycleTrackingStart, Clock clock) {
        this.clock = clock;
        this.queries = queries;
        this.currency = currency;
        this.zone = ZoneId.of(timeZone);
        this.trackingStart = OffsetDateTime.parse(lifecycleTrackingStart).toInstant();
    }

    // ---------- Period ----------

    public AnalyticsPeriod parsePeriod(String from, String to) {
        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            throw AnalyticsException.invalidPeriod("Both 'from' and 'to' are required ISO-8601 date-times with an offset, e.g. 2026-01-01T00:00:00+08:00.");
        }
        Instant fromInstant = parseInstant("from", from);
        Instant toInstant = parseInstant("to", to);
        if (!fromInstant.isBefore(toInstant)) {
            throw AnalyticsException.invalidPeriod("'from' must be before 'to'.");
        }
        if (Duration.between(fromInstant, toInstant).compareTo(Duration.ofDays(MAX_PERIOD_DAYS)) > 0) {
            throw AnalyticsException.invalidPeriod("The period cannot be longer than " + MAX_PERIOD_DAYS + " days.");
        }
        return new AnalyticsPeriod(fromInstant, toInstant, AnalyticsPeriod.BOUNDARY, zone.getId());
    }

    private static Instant parseInstant(String name, String value) {
        try {
            return OffsetDateTime.parse(value.trim()).toInstant();
        } catch (DateTimeException e) {
            throw AnalyticsException.invalidPeriod("'" + name + "' must be an ISO-8601 date-time with an offset, e.g. 2026-01-01T00:00:00+08:00.");
        }
    }

    // ---------- Scopes ----------

    public AnalyticsResponse ownerSummary(User owner, AnalyticsPeriod period) {
        Instant asOf = clock.instant();
        Long ownerId = owner.getUserID();
        long listingCount = queries.countListingsByOwner(ownerId);
        List<RentalRow> rentals = queries.findRentalRowsByOwner(ownerId);
        List<PaymentRow> payments = queries.findPaymentRowsByOwner(ownerId, period.from(), period.to());

        Map<String, Metric> metrics = new LinkedHashMap<>();
        metrics.put("listingCount", Metric.available(listingCount, COUNT, SNAPSHOT,
                "Listings you currently own. Not the number created during the period."));

        long activeListings = countOccupiedListings(rentals, asOf);
        metrics.put("activeTenancyCount", Metric.available(activeListings, COUNT, SNAPSHOT,
                "Your listings with an active tenancy whose start is at or before asOf and whose end is after asOf."));
        metrics.put("occupancyRate", rate(activeListings, listingCount, SNAPSHOT,
                "Listings occupied at asOf divided by all listings you own; tenancy start is inclusive and end is exclusive.",
                "No listings, so occupancy cannot be calculated."));

        putRentalMetrics(metrics, rentals);
        putTenancyMetrics(metrics, rentals);

        Object[] rating = queries.findRatingSummaryForUser(ownerId);
        Double averageRating = (Double) rating[0];
        long reviewCount = (Long) rating[1];
        metrics.put("ownerReviewCount", Metric.available(reviewCount, COUNT, SNAPSHOT,
                "Reviews other users have left about you. Reviews are per user, not per listing, and are not dated."));
        metrics.put("ownerAverageRating", reviewCount == 0
                ? Metric.unavailable("rating_out_of_5", SNAPSHOT, "Average rating of reviews about you.", "No reviews yet.")
                : Metric.available(BigDecimal.valueOf(averageRating).setScale(2, RoundingMode.HALF_UP), "rating_out_of_5", SNAPSHOT,
                "Average rating of reviews about you."));

        putPaymentMetrics(metrics, payments);
        putPaymentChanges(metrics, payments, queries.findPaymentRowsByOwner(ownerId, previousFrom(period), period.from()));
        putOccupancyMetrics(metrics, rentals, listingCount, period);
        putTenantsInPeriod(metrics, rentals, period);

        metrics.put("newListingCount", lifecycleCount(period, "Listings you published during the period.",
                (from, to) -> queries.countListingsCreatedByOwner(ownerId, from, to)));
        putLifecycleCounts(metrics, rentals, period);
        metrics.put("offersSentChange", percentChange(period,
                "Change in offers sent compared with the previous period of the same length.",
                (from, to) -> countInRange(rentals, RentalRow::createdAt, from, to)));
        metrics.put("averageDaysOnMarket", averageDaysOnMarket(rentals, period));

        Map<String, Series> series = new LinkedHashMap<>();
        series.put("monthlyRecordedRentPayments", monthlyPaymentSeries(payments, period));
        series.put("tenancyDurationDistribution", tenancyDistribution(rentals));
        series.put("monthlyOccupancyRate", monthlyOccupancyRateSeries(rentals, listingCount, period));

        return response("owner", period, null, metrics, series, asOf);
    }

    public AnalyticsResponse listingAnalytics(User owner, Long listingId, AnalyticsPeriod period) {
        Instant asOf = clock.instant();
        Listings listing = queries.findListingOwnedBy(listingId, owner.getUserID())
                .orElseThrow(AnalyticsException::listingNotFound);
        List<RentalRow> rentals = queries.findRentalRowsByListing(listingId);
        List<PaymentRow> payments = queries.findPaymentRowsByListing(listingId, period.from(), period.to());

        Map<String, Object> listingInfo = new LinkedHashMap<>();
        listingInfo.put("listingId", listing.getListingID());
        listingInfo.put("name", listing.getName());
        listingInfo.put("type", listing.getType());
        listingInfo.put("location", listing.getLocation());
        listingInfo.put("price", listing.getPrice());
        listingInfo.put("listingPicture", listing.getListingpicture());
        listingInfo.put("listedAt", listing.getCreatedAt() == null ? null : listing.getCreatedAt().toInstant());

        Map<String, Metric> metrics = new LinkedHashMap<>();
        boolean occupied = countOccupiedListings(rentals, asOf) > 0;
        metrics.put("occupancyStatus", Metric.available(occupied ? "occupied" : "vacant", "status", SNAPSHOT,
                "'occupied' when an active tenancy covers asOf (start inclusive, end exclusive), otherwise 'vacant'."));

        putRentalMetrics(metrics, rentals);
        putTenancyMetrics(metrics, rentals);
        putPaymentMetrics(metrics, payments);
        putPaymentChanges(metrics, payments, queries.findPaymentRowsByListing(listingId, previousFrom(period), period.from()));
        putOccupancyMetrics(metrics, rentals, 1, period);
        putLifecycleCounts(metrics, rentals, period);

        metrics.put("listingViews", Metric.unavailable(COUNT, PERIOD, "Times the listing detail page was opened.", NOT_TRACKED));
        metrics.put("daysOnMarket", listingDaysOnMarket(listing, rentals, asOf));

        Map<String, Series> series = new LinkedHashMap<>();
        series.put("monthlyRecordedRentPayments", monthlyPaymentSeries(payments, period));
        series.put("monthlyOccupancy", monthlyOccupancySeries(rentals, period));

        return response("listing", period, listingInfo, metrics, series, asOf);
    }

    public AnalyticsResponse platformSummary(User actor, AnalyticsPeriod period) {
        Instant asOf = clock.instant();
        requireAdmin(actor);
        List<RentalRow> rentals = queries.findAllRentalRows();
        List<PaymentRow> payments = queries.findAllPaymentRows(period.from(), period.to());

        long userCount = queries.countAllUsers();
        long bannedUsers = queries.countUsersWithFlag(2);
        long flaggedUsers = queries.countUsersWithFlag(1);
        long flaggedListings = queries.countFlaggedListings();
        long flaggedReviews = queries.countFlaggedReviews();

        Map<String, Metric> metrics = new LinkedHashMap<>();
        metrics.put("registeredUserCount", Metric.available(userCount, COUNT, SNAPSHOT, "All user accounts."));
        metrics.put("listingCount", Metric.available(queries.countAllListings(), COUNT, SNAPSHOT, "All listings currently stored."));
        metrics.put("ownerUserCount", Metric.available(queries.countDistinctListingOwners(), COUNT, SNAPSHOT,
                "Users who own at least one listing. A user can be both an owner and a tenant."));
        metrics.put("tenantUserCount", Metric.available(countDistinctAcceptedTenants(rentals), COUNT, SNAPSHOT,
                "Users who are the tenant on at least one accepted (active or terminated) rental. A user can be both an owner and a tenant."));
        metrics.put("bannedUserCount", Metric.available(bannedUsers, COUNT, SNAPSHOT, "Users with flag value 2 (banned)."));
        metrics.put("userBanRate", rate(bannedUsers, userCount, SNAPSHOT,
                "Banned users divided by all users.", "No users, so the ban rate cannot be calculated."));
        metrics.put("flaggedUserCount", Metric.available(flaggedUsers, COUNT, SNAPSHOT,
                "Users currently flagged (flag value 1). Counts flagged items, not individual reports."));
        metrics.put("flaggedListingCount", Metric.available(flaggedListings, COUNT, SNAPSHOT,
                "Listings currently flagged. Counts flagged items, not individual reports."));
        metrics.put("flaggedReviewCount", Metric.available(flaggedReviews, COUNT, SNAPSHOT,
                "Reviews currently flagged. Counts flagged items, not individual reports."));

        putRentalMetrics(metrics, rentals);
        long terminated = countStatus(rentals, STATUS_TERMINATED);
        metrics.put("terminationRate", rate(terminated, countAccepted(rentals), SNAPSHOT,
                "Terminated rentals divided by accepted (active or terminated) rentals.",
                "No accepted rentals, so the termination rate cannot be calculated."));

        putPaymentMetrics(metrics, payments);
        putPaymentChanges(metrics, payments, queries.findAllPaymentRows(previousFrom(period), period.from()));

        metrics.put("newUserCount", lifecycleCount(period, "Accounts created during the period.", queries::countUsersCreated));
        metrics.put("newUserCountChange", percentChange(period,
                "Change in new accounts compared with the previous period of the same length.", queries::countUsersCreated));
        metrics.put("newListingCount", lifecycleCount(period, "Listings published during the period.", queries::countListingsCreated));
        metrics.put("newListingCountChange", percentChange(period,
                "Change in new listings compared with the previous period of the same length.", queries::countListingsCreated));
        putLifecycleCounts(metrics, rentals, period);
        metrics.put("averageDaysOnMarket", averageDaysOnMarket(rentals, period));

        metrics.put("reportResolutionRate", Metric.unavailable(PERCENT, PERIOD, "Resolved reports divided by submitted reports.",
                "Not available: reports are stored as flags without a report record or resolution timestamp."));

        Map<String, Series> series = new LinkedHashMap<>();
        series.put("monthlyRecordedRentPayments", monthlyPaymentSeries(payments, period));
        series.put("flaggedItemsByType", Series.available(COUNT, SNAPSHOT, "Items currently flagged, by item type.", List.of(
                new Series.Point("listings", flaggedListings),
                new Series.Point("users", flaggedUsers),
                new Series.Point("reviews", flaggedReviews))));

        series.put("userDistribution", Series.available(COUNT, SNAPSHOT,
                "Every user in exactly one group: owns at least one listing, has been the tenant on an accepted rental, "
                        + "both, or neither. The groups add up to all users.",
                List.of(
                        new Series.Point("Owners only", queries.countUsersByRole(true, false, ACCEPTED_STATUSES)),
                        new Series.Point("Tenants only", queries.countUsersByRole(false, true, ACCEPTED_STATUSES)),
                        new Series.Point("Both", queries.countUsersByRole(true, true, ACCEPTED_STATUSES)),
                        new Series.Point("Neither", queries.countUsersByRole(false, false, ACCEPTED_STATUSES)))));

        return response("platform", period, null, metrics, series, asOf);
    }

    public boolean isAdmin(User user) {
        return user != null && user.isAdmin();
    }

    private void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw AnalyticsException.forbidden();
        }
    }

    // ---------- Shared metric builders ----------

    private void putRentalMetrics(Map<String, Metric> metrics, List<RentalRow> rentals) {
        long total = rentals.size();
        long accepted = countAccepted(rentals);
        metrics.put("rentalRecordCount", Metric.available(total, COUNT, SNAPSHOT,
                "Rental records (offers) in any status. Rejected offers are not recorded by the app."));
        metrics.put("pendingRentalRecordCount", Metric.available(countStatus(rentals, STATUS_PENDING), COUNT, SNAPSHOT,
                "Rental records with status 'pending' (offer sent, not yet accepted)."));
        metrics.put("acceptedRentalRecordCount", Metric.available(accepted, COUNT, SNAPSHOT,
                "Rental records with status 'active' or 'terminated'."));
        metrics.put("terminatedRentalRecordCount", Metric.available(countStatus(rentals, STATUS_TERMINATED), COUNT, SNAPSHOT,
                "Rental records with status 'terminated'."));
        metrics.put("acceptanceRate", rate(accepted, total, SNAPSHOT,
                "Accepted rental records divided by all rental records. Pending offers count as not accepted.",
                "No rental records, so the acceptance rate cannot be calculated."));
    }

    private void putTenancyMetrics(Map<String, Metric> metrics, List<RentalRow> rentals) {
        metrics.put("tenantsHostedCount", Metric.available(countDistinctAcceptedTenants(rentals), COUNT, SNAPSHOT,
                "Distinct tenants on accepted (active or terminated) rentals."));

        List<BigDecimal> durations = tenancyDurations(rentals);
        String definition = "Average tenancy length of accepted rentals, from rental start to its end. "
                + "Terminated rentals end at their recorded termination time (or, if terminated before that was recorded, "
                + "at the lease expiry the app overwrites with the termination date), so this is the actual length; "
                + "for active rentals it is the contracted length.";
        if (durations.isEmpty()) {
            metrics.put("averageTenancyMonths", Metric.unavailable(MONTHS, SNAPSHOT, definition, "No accepted rentals with valid start and end dates."));
        } else {
            BigDecimal sum = durations.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            metrics.put("averageTenancyMonths", Metric.available(
                    sum.divide(BigDecimal.valueOf(durations.size()), 1, RoundingMode.HALF_UP), MONTHS, SNAPSHOT, definition));
        }
    }

    private void putPaymentMetrics(Map<String, Metric> metrics, List<PaymentRow> payments) {
        metrics.put("recordedRentPaymentCount", Metric.available((long) payments.size(), COUNT, PERIOD,
                "Rent payment records whose billing-month date falls in the period. The date is the month paid for, not the transaction time."));
        metrics.put("recordedRentPaymentTotal", Metric.available(sumAmounts(payments), currency, PERIOD,
                "Sum of recorded rent payment amounts (whole " + currency + ") with a billing-month date in the period. "
                        + "Excludes deposits and does not subtract termination refunds; payments have no failed or refunded state."));
    }

    private Series monthlyPaymentSeries(List<PaymentRow> payments, AnalyticsPeriod period) {
        Map<YearMonth, Long> totals = new LinkedHashMap<>();
        for (YearMonth month : monthsInPeriod(period)) {
            totals.put(month, 0L);
        }
        for (PaymentRow payment : payments) {
            YearMonth month = YearMonth.from(payment.date().toInstant().atZone(zone));
            totals.computeIfPresent(month, (key, total) -> total + nullToZero(payment.amount()));
        }
        List<Series.Point> points = totals.entrySet().stream()
                .map(entry -> new Series.Point(entry.getKey().format(DateTimeFormatter.ofPattern("yyyy-MM")), entry.getValue()))
                .toList();
        return Series.available(currency, PERIOD,
                "Recorded rent payment totals per calendar month in " + zone.getId() + ". Edge months only include dates inside the period.",
                points);
    }

    private Series monthlyOccupancySeries(List<RentalRow> rentals, AnalyticsPeriod period) {
        List<Series.Point> points = new ArrayList<>();
        for (YearMonth month : monthsInPeriod(period)) {
            Instant monthStart = max(month.atDay(1).atStartOfDay(zone).toInstant(), period.from());
            Instant monthEnd = min(month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant(), period.to());
            boolean occupied = rentals.stream()
                    .filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())))
                    .filter(rental -> rental.rentalDate() != null && rental.tenancyEnd() != null)
                    .anyMatch(rental -> rental.rentalDate().toInstant().isBefore(monthEnd)
                            && rental.tenancyEnd().toInstant().isAfter(monthStart));
            points.add(new Series.Point(month.format(DateTimeFormatter.ofPattern("yyyy-MM")), occupied ? "occupied" : "vacant"));
        }
        return Series.available("status", PERIOD,
                "'occupied' when an accepted rental's start-to-expiry range overlaps the month (in " + zone.getId()
                        + "), otherwise 'vacant'. Terminated rentals end on their termination date.",
                points);
    }

    private Series tenancyDistribution(List<RentalRow> rentals) {
        long[] counts = new long[TENANCY_BUCKET_LABELS.length];
        for (BigDecimal months : tenancyDurations(rentals)) {
            int bucket = 0;
            while (bucket < TENANCY_BUCKET_BOUNDS.length && months.compareTo(BigDecimal.valueOf(TENANCY_BUCKET_BOUNDS[bucket])) >= 0) {
                bucket++;
            }
            counts[bucket]++;
        }
        List<Series.Point> points = new ArrayList<>();
        for (int i = 0; i < counts.length; i++) {
            points.add(new Series.Point(TENANCY_BUCKET_LABELS[i], counts[i]));
        }
        return Series.available(COUNT, SNAPSHOT,
                "Accepted rentals grouped by tenancy length (see averageTenancyMonths). Lower bounds are inclusive.", points);
    }

    // ---------- Comparisons and occupancy over time ----------

    /** Start of the previous period of the same length, which ends where this period starts. */
    private static Instant previousFrom(AnalyticsPeriod period) {
        return period.from().minus(Duration.between(period.from(), period.to()));
    }

    /** Relative change in percent. Unavailable when the previous value is zero, since the change would be undefined. */
    private static Metric relativeChange(long current, long previous, String definition) {
        if (previous == 0) {
            return Metric.unavailable(PERCENT, PERIOD, definition,
                    "Nothing in the previous period, so a percentage change cannot be calculated.");
        }
        BigDecimal value = BigDecimal.valueOf((current - previous) * 100)
                .divide(BigDecimal.valueOf(previous), 1, RoundingMode.HALF_UP);
        return Metric.available(value, PERCENT, PERIOD, definition);
    }

    private void putPaymentChanges(Map<String, Metric> metrics, List<PaymentRow> payments, List<PaymentRow> previousPayments) {
        metrics.put("recordedRentPaymentTotalChange", relativeChange(sumAmounts(payments), sumAmounts(previousPayments),
                "Change in rent recorded compared with the previous period of the same length, by billing month."));
        metrics.put("recordedRentPaymentCountChange", relativeChange(payments.size(), previousPayments.size(),
                "Change in payments recorded compared with the previous period of the same length, by billing month."));
    }

    private void putOccupancyMetrics(Map<String, Metric> metrics, List<RentalRow> rentals, long listingCount, AnalyticsPeriod period) {
        String definition = "Share of the period the listings were occupied: time covered by accepted rentals divided by "
                + "(number of listings x length of the period). Uses the listings that exist now.";
        String changeDefinition = "Change in average occupancy compared with the previous period of the same length, in percentage points.";
        if (listingCount == 0) {
            String reason = "No listings, so occupancy cannot be calculated.";
            metrics.put("averageOccupancyRate", Metric.unavailable(PERCENT, PERIOD, definition, reason));
            metrics.put("averageOccupancyRateChange", Metric.unavailable(PERCENTAGE_POINTS, PERIOD, changeDefinition, reason));
            return;
        }
        Instant previousFrom = previousFrom(period);
        BigDecimal current = occupancyPercent(occupiedMillis(rentals, period.from(), period.to()), listingCount, period.from(), period.to());
        metrics.put("averageOccupancyRate", Metric.available(current.setScale(1, RoundingMode.HALF_UP), PERCENT, PERIOD, definition));

        long previousOccupied = occupiedMillis(rentals, previousFrom, period.from());
        BigDecimal previous = occupancyPercent(previousOccupied, listingCount, previousFrom, period.from());
        // Percentage-point differences are defined even when previous occupancy is zero.
        metrics.put("averageOccupancyRateChange", Metric.available(
                current.subtract(previous).setScale(1, RoundingMode.HALF_UP), PERCENTAGE_POINTS, PERIOD, changeDefinition));
    }

    private void putTenantsInPeriod(Map<String, Metric> metrics, List<RentalRow> rentals, AnalyticsPeriod period) {
        long current = countTenantsBetween(rentals, period.from(), period.to());
        long previous = countTenantsBetween(rentals, previousFrom(period), period.from());
        metrics.put("tenantsInPeriodCount", Metric.available(current, COUNT, PERIOD,
                "Distinct tenants whose accepted tenancy overlapped the period."));
        metrics.put("tenantsInPeriodChange", relativeChange(current, previous,
                "Change in tenants compared with the previous period of the same length."));
    }

    private Series monthlyOccupancyRateSeries(List<RentalRow> rentals, long listingCount, AnalyticsPeriod period) {
        String definition = "Occupancy per calendar month (in " + zone.getId() + "): time covered by accepted rentals divided by "
                + "(listings x length of the month). Uses the listings that exist now; edge months only count time inside the period.";
        if (listingCount == 0) {
            return Series.unavailable(PERCENT, PERIOD, definition, "No listings, so occupancy cannot be calculated.");
        }
        List<Series.Point> points = new ArrayList<>();
        for (YearMonth month : monthsInPeriod(period)) {
            Instant monthStart = max(month.atDay(1).atStartOfDay(zone).toInstant(), period.from());
            Instant monthEnd = min(month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant(), period.to());
            BigDecimal rate = occupancyPercent(occupiedMillis(rentals, monthStart, monthEnd), listingCount, monthStart, monthEnd);
            points.add(new Series.Point(month.format(DateTimeFormatter.ofPattern("yyyy-MM")), rate.setScale(1, RoundingMode.HALF_UP)));
        }
        return Series.available(PERCENT, PERIOD, definition, points);
    }

    /** Occupied share as a percentage with 4 decimal places; callers round for display so changes use exact values. */
    private static BigDecimal occupancyPercent(long occupiedMillis, long listingCount, Instant from, Instant to) {
        long capacity = listingCount * Duration.between(from, to).toMillis();
        return BigDecimal.valueOf(occupiedMillis).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(capacity), 4, RoundingMode.HALF_UP);
    }

    /** Time in [from, to) covered by accepted rentals. Overlapping rentals on the same listing are merged, never double-counted. */
    private static long occupiedMillis(List<RentalRow> rentals, Instant from, Instant to) {
        Map<Long, List<long[]>> intervalsByListing = new HashMap<>();
        for (RentalRow rental : rentals) {
            if (!ACCEPTED_STATUSES.contains(normalise(rental.status())) || rental.rentalDate() == null || rental.tenancyEnd() == null) {
                continue;
            }
            long start = Math.max(rental.rentalDate().getTime(), from.toEpochMilli());
            long end = Math.min(rental.tenancyEnd().getTime(), to.toEpochMilli());
            if (end > start) {
                intervalsByListing.computeIfAbsent(rental.listingId(), id -> new ArrayList<>()).add(new long[]{start, end});
            }
        }
        long total = 0;
        for (List<long[]> intervals : intervalsByListing.values()) {
            intervals.sort(Comparator.comparingLong(interval -> interval[0]));
            long mergedStart = intervals.get(0)[0];
            long mergedEnd = intervals.get(0)[1];
            for (long[] interval : intervals) {
                if (interval[0] > mergedEnd) {
                    total += mergedEnd - mergedStart;
                    mergedStart = interval[0];
                    mergedEnd = interval[1];
                } else {
                    mergedEnd = Math.max(mergedEnd, interval[1]);
                }
            }
            total += mergedEnd - mergedStart;
        }
        return total;
    }

    private static long countTenantsBetween(List<RentalRow> rentals, Instant from, Instant to) {
        return rentals.stream()
                .filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())))
                .filter(rental -> rental.tenantUserId() != null && rental.rentalDate() != null && rental.tenancyEnd() != null)
                .filter(rental -> rental.rentalDate().toInstant().isBefore(to) && rental.tenancyEnd().toInstant().isAfter(from))
                .map(RentalRow::tenantUserId)
                .distinct()
                .count();
    }

    // ---------- Lifecycle timestamps ----------

    /** A count of dated events in the period. Unavailable if tracking started after the period; partial coverage is flagged. */
    private Metric lifecycleCount(AnalyticsPeriod period, String definition, BiFunction<Instant, Instant, Long> countBetween) {
        if (!trackingStart.isBefore(period.to())) {
            return Metric.unavailable(COUNT, PERIOD, definition, notTrackedReason());
        }
        return Metric.available(countBetween.apply(period.from(), period.to()), COUNT, PERIOD, definition)
                .withCoverage(coverage(period));
    }

    /** Percentage change against the previous period of the same length. Both periods must be fully tracked. */
    private Metric percentChange(AnalyticsPeriod period, String definition, BiFunction<Instant, Instant, Long> countBetween) {
        Instant previousFrom = previousFrom(period);
        if (previousFrom.isBefore(trackingStart)) {
            return Metric.unavailable(PERCENT, PERIOD, definition,
                    "Needs this period and the previous one to be fully tracked; tracking started on " + formatDate(trackingStart) + ".");
        }
        Metric change = relativeChange(countBetween.apply(period.from(), period.to()),
                countBetween.apply(previousFrom, period.from()), definition);
        return Metric.AVAILABLE.equals(change.availability())
                ? change.withCoverage(new Metric.Coverage(previousFrom, period.to(), true))
                : change;
    }

    private void putLifecycleCounts(Map<String, Metric> metrics, List<RentalRow> rentals, AnalyticsPeriod period) {
        metrics.put("offersSentCount", lifecycleCount(period, "Offers sent during the period.",
                (from, to) -> countInRange(rentals, RentalRow::createdAt, from, to)));
        metrics.put("offersAcceptedCount", lifecycleCount(period, "Offers accepted during the period.",
                (from, to) -> countInRange(rentals, RentalRow::acceptedAt, from, to)));
        metrics.put("terminationsCount", lifecycleCount(period, "Tenancies terminated during the period.",
                (from, to) -> countInRange(rentals, RentalRow::terminatedAt, from, to)));
    }

    private Metric averageDaysOnMarket(List<RentalRow> rentals, AnalyticsPeriod period) {
        String definition = "Average days from publishing a listing to accepting an offer on it, for offers accepted during the period. "
                + "Only listings published after tracking started are included.";
        if (!trackingStart.isBefore(period.to())) {
            return Metric.unavailable("days", PERIOD, definition, notTrackedReason());
        }
        List<BigDecimal> days = rentals.stream()
                .filter(rental -> inRange(rental.acceptedAt(), period.from(), period.to()))
                .filter(rental -> rental.listingCreatedAt() != null && !rental.acceptedAt().before(rental.listingCreatedAt()))
                .map(rental -> daysBetween(rental.listingCreatedAt().toInstant(), rental.acceptedAt().toInstant()))
                .toList();
        if (days.isEmpty()) {
            return Metric.unavailable("days", PERIOD, definition,
                    "No offers were accepted in this period on listings published since tracking started.");
        }
        BigDecimal sum = days.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return Metric.available(sum.divide(BigDecimal.valueOf(days.size()), 1, RoundingMode.HALF_UP), "days", PERIOD, definition)
                .withCoverage(coverage(period));
    }

    private Metric listingDaysOnMarket(Listings listing, List<RentalRow> rentals, Instant asOf) {
        String definition = "Days from publishing this listing to its first accepted offer, or until now if it has not been rented.";
        if (listing.getCreatedAt() == null) {
            return Metric.unavailable("days", SNAPSHOT, definition,
                    "Published before " + formatDate(trackingStart) + ", when publish dates started being recorded.");
        }
        Optional<Instant> firstAccepted = rentals.stream()
                .map(RentalRow::acceptedAt)
                .filter(Objects::nonNull)
                .map(Date::toInstant)
                .min(Comparator.naturalOrder());
        if (firstAccepted.isEmpty() && countAccepted(rentals) > 0) {
            return Metric.unavailable("days", SNAPSHOT, definition, "Accepted before acceptance dates started being recorded.");
        }
        Instant listed = listing.getCreatedAt().toInstant();
        Instant end = firstAccepted.orElse(asOf);
        if (end.isBefore(listed)) {
            return Metric.unavailable("days", SNAPSHOT, definition, "The recorded acceptance is earlier than the recorded publish date.");
        }
        return Metric.available(daysBetween(listed, end), "days", SNAPSHOT, definition);
    }

    private Metric.Coverage coverage(AnalyticsPeriod period) {
        return new Metric.Coverage(max(period.from(), trackingStart), period.to(), !period.from().isBefore(trackingStart));
    }

    private String notTrackedReason() {
        return "Not tracked for this period: these dates are recorded from " + formatDate(trackingStart) + " onwards.";
    }

    private String formatDate(Instant instant) {
        return DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH).format(instant.atZone(zone));
    }

    private static boolean inRange(Date date, Instant from, Instant to) {
        return date != null && !date.toInstant().isBefore(from) && date.toInstant().isBefore(to);
    }

    private static long countInRange(List<RentalRow> rentals, Function<RentalRow, Date> dateOf, Instant from, Instant to) {
        return rentals.stream().filter(rental -> inRange(dateOf.apply(rental), from, to)).count();
    }

    private static BigDecimal daysBetween(Instant from, Instant to) {
        return BigDecimal.valueOf(Duration.between(from, to).toMinutes())
                .divide(BigDecimal.valueOf(24 * 60), 1, RoundingMode.HALF_UP);
    }

    // ---------- Helpers ----------

    private AnalyticsResponse response(String scope, AnalyticsPeriod period, Map<String, Object> listing,
                                       Map<String, Metric> metrics, Map<String, Series> series, Instant asOf) {
        return new AnalyticsResponse(AnalyticsResponse.SCHEMA_VERSION, scope, asOf, period, listing, metrics, series);
    }

    private static Metric rate(long numerator, long denominator, String basis, String definition, String reasonWhenEmpty) {
        if (denominator == 0) {
            return Metric.unavailable(PERCENT, basis, definition, reasonWhenEmpty);
        }
        BigDecimal value = BigDecimal.valueOf(numerator * 100)
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
        return Metric.available(value, PERCENT, basis, definition);
    }

    private List<BigDecimal> tenancyDurations(List<RentalRow> rentals) {
        return rentals.stream()
                .filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())))
                .filter(rental -> rental.rentalDate() != null && rental.tenancyEnd() != null)
                .map(rental -> monthsBetween(rental.rentalDate(), rental.tenancyEnd()))
                .filter(months -> months.signum() > 0)
                .toList();
    }

    /** Whole calendar months plus the remaining days as a fraction of the following month. */
    private BigDecimal monthsBetween(Date start, Date end) {
        LocalDate startDate = start.toInstant().atZone(zone).toLocalDate();
        LocalDate endDate = end.toInstant().atZone(zone).toLocalDate();
        long wholeMonths = ChronoUnit.MONTHS.between(startDate, endDate);
        LocalDate anchor = startDate.plusMonths(wholeMonths);
        long remainingDays = ChronoUnit.DAYS.between(anchor, endDate);
        BigDecimal fraction = BigDecimal.valueOf(remainingDays)
                .divide(BigDecimal.valueOf(anchor.lengthOfMonth()), 4, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(wholeMonths).add(fraction);
    }

    private List<YearMonth> monthsInPeriod(AnalyticsPeriod period) {
        YearMonth first = YearMonth.from(period.from().atZone(zone));
        YearMonth last = YearMonth.from(period.to().minusNanos(1).atZone(zone));
        List<YearMonth> months = new ArrayList<>();
        for (YearMonth month = first; !month.isAfter(last); month = month.plusMonths(1)) {
            months.add(month);
        }
        return months;
    }

    private static long countOccupiedListings(List<RentalRow> rentals, Instant asOf) {
        return rentals.stream()
                .filter(rental -> STATUS_ACTIVE.equals(normalise(rental.status())))
                .filter(rental -> rental.rentalDate() != null && rental.tenancyEnd() != null)
                .filter(rental -> !rental.rentalDate().toInstant().isAfter(asOf)
                        && rental.tenancyEnd().toInstant().isAfter(asOf))
                .map(RentalRow::listingId)
                .distinct()
                .count();
    }

    private static long countDistinctAcceptedTenants(List<RentalRow> rentals) {
        return rentals.stream()
                .filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())))
                .map(RentalRow::tenantUserId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
    }

    private static long countAccepted(List<RentalRow> rentals) {
        return rentals.stream().filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status()))).count();
    }

    private static long countStatus(List<RentalRow> rentals, String status) {
        return rentals.stream().filter(rental -> status.equals(normalise(rental.status()))).count();
    }

    private static long sumAmounts(List<PaymentRow> payments) {
        return payments.stream().mapToLong(payment -> nullToZero(payment.amount())).reduce(0L, Math::addExact);
    }

    private static String normalise(String status) {
        return status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
    }

    private static long nullToZero(Long value) {
        return value == null ? 0L : value;
    }

    private static Instant max(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }

    private static Instant min(Instant a, Instant b) {
        return a.isBefore(b) ? a : b;
    }
}
