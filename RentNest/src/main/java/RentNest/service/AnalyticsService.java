package RentNest.service;

import RentNest.dto.AnalyticsPeriod;
import RentNest.dto.AnalyticsValueDTO;
import RentNest.dto.AdminAnalyticsDTO;
import RentNest.dto.AnalyticsChartPointDTO;
import RentNest.dto.OwnerAnalyticsDTO;
import RentNest.dto.PropertyAnalyticsDTO;
import RentNest.dto.AnalyticsStatusPointDTO;
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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;


@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_TERMINATED = "terminated";
    private static final Set<String> ACCEPTED_STATUSES = Set.of(STATUS_ACTIVE, STATUS_TERMINATED);


    // Contracted/actual tenancy length buckets, lower bound inclusive, in months
    private static final int[] TENANCY_BUCKET_BOUNDS = {3, 6, 12, 24};
    private static final String[] TENANCY_BUCKET_LABELS = {"<3 months", "3-6 months", "6-12 months", "12-24 months", ">=24 months"};

    private final AnalyticsQueryRepository analyticsQueryRepository;
    private final String currency;
    private final ZoneId zone;
    private final Clock clock;

    @Autowired
    public AnalyticsService(
            AnalyticsQueryRepository analyticsQueryRepository,
            @Value("${analytics.currency:SGD}") String currency,
            @Value("${analytics.time-zone:Asia/Singapore}") String timeZone) {
        this(analyticsQueryRepository, currency, timeZone, Clock.systemUTC());
    }

    AnalyticsService(AnalyticsQueryRepository analyticsQueryRepository, String currency, String timeZone,
                     Clock clock) {
        this.clock = clock;
        this.analyticsQueryRepository = analyticsQueryRepository;
        this.currency = currency;
        this.zone = ZoneId.of(timeZone);
    }

    // Date validation

    public AnalyticsPeriod parsePeriod(String from, String to) {
        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            throw new IllegalArgumentException("Both 'from' and 'to' are required ISO-8601 date-times with an offset, e.g. 2026-01-01T00:00:00+08:00.");
        }
        Instant fromInstant = parseInstant("from", from);
        Instant toInstant = parseInstant("to", to);
        if (!fromInstant.isBefore(toInstant)) {
            throw new IllegalArgumentException("'from' must be before 'to'.");
        }
        AnalyticsPeriod period = new AnalyticsPeriod();
        period.setFrom(fromInstant);
        period.setTo(toInstant);
        return period;
    }

    // Dashboard analytics

    public OwnerAnalyticsDTO getOwnerAnalytics(User owner, AnalyticsPeriod period) {
        Instant asOf = clock.instant();
        Long ownerId = owner.getUserID();
        long listingCount = analyticsQueryRepository.countListingsByOwner(ownerId);
        List<RentalRow> rentals = analyticsQueryRepository.findRentalRowsByOwner(ownerId);
        List<PaymentRow> payments = analyticsQueryRepository.findPaymentRowsByOwner(ownerId, period.getFrom(), period.getTo());
        AnalyticsValueDTO averageTenancy = calculateAverageTenancy(rentals);
        Object[] rating = analyticsQueryRepository.findRatingSummaryForUser(ownerId);
        long reviewCount = (Long) rating[1];
        List<AnalyticsChartPointDTO> occupancy = buildMonthlyOccupancyRateSeries(rentals, listingCount, period);

        OwnerAnalyticsDTO response = new OwnerAnalyticsDTO();
        response.setAsOf(asOf);
        response.setCurrency(currency);
        response.setTotalListings(listingCount);
        response.setOccupiedListings(countOccupiedListings(rentals, asOf));
        response.setTotalViews(analyticsQueryRepository.countAllListingViewsByOwner(ownerId));
        response.setTotalRentCollected(analyticsQueryRepository.sumAllRecordedRentPaymentsByOwner(ownerId));
        response.setTenantsHosted(countDistinctAcceptedTenants(rentals));
        response.setAverageTenancyMonths(averageTenancy.getValue());
        response.setAverageTenancyUnavailableReason(averageTenancy.getUnavailableReason());
        response.setReviewCount(reviewCount);
        response.setAverageRating(reviewCount == 0 ? null
                : BigDecimal.valueOf((Double) rating[0]).setScale(2, RoundingMode.HALF_UP));
        response.setAverageRatingUnavailableReason(reviewCount == 0 ? "No reviews yet." : null);
        response.setTerminations(countInRange(rentals, RentalRow::terminatedAt, period.getFrom(), period.getTo()));
        response.setMonthlyRent(buildMonthlyPaymentSeries(payments, period));
        response.setTenancyLengths(buildTenancyDistribution(rentals));
        response.setMonthlyOccupancy(occupancy);
        response.setMonthlyOccupancyUnavailableReason(listingCount == 0 ? "No listings, so occupancy cannot be calculated." : null);
        response.setMonthlyAcceptedOffers(buildMonthlyLifecycleSeries(
                rentals, period, RentalRow::acceptedAt));
        response.setMonthlyTerminations(buildMonthlyLifecycleSeries(
                rentals, period, RentalRow::terminatedAt));
        response.setMonthlyAverageDaysOnMarket(buildMonthlyDaysOnMarketSeries(rentals, period, asOf));
        return response;
    }

    public PropertyAnalyticsDTO getOwnerPropertyListingAnalytics(User owner, Long listingId, AnalyticsPeriod period) {
        Instant asOf = clock.instant();
        Listings listing = analyticsQueryRepository.findListingOwnedBy(listingId, owner.getUserID())
                .orElseThrow(() -> new NoSuchElementException("Listing not found."));
        List<RentalRow> rentals = analyticsQueryRepository.findRentalRowsByListing(listingId);
        List<PaymentRow> payments = analyticsQueryRepository.findPaymentRowsByListing(listingId, period.getFrom(), period.getTo());
        AnalyticsValueDTO averageTenancy = calculateAverageTenancy(rentals);
        AnalyticsValueDTO acceptance = rate(countAccepted(rentals), rentals.size());
        AnalyticsValueDTO daysOnMarket = listingDaysOnMarket(listing.getCreatedAt(), rentals, asOf);

        PropertyAnalyticsDTO response = new PropertyAnalyticsDTO();
        response.setAsOf(asOf);
        response.setCurrency(currency);
        response.setListingId(listing.getListingID());
        response.setName(listing.getName());
        response.setType(listing.getType());
        response.setLocation(listing.getLocation());
        response.setPrice(listing.getPrice());
        response.setListingPicture(listing.getListingpicture());
        response.setListedAt(listing.getCreatedAt() == null ? null : listing.getCreatedAt().toInstant());
        response.setFirstAcceptedAt(hasUndatedAcceptance(rentals) ? null : firstAcceptedAt(rentals).orElse(null));
        response.setOccupancyStatus(countOccupiedListings(rentals, asOf) > 0 ? "occupied" : "vacant");
        response.setTotalRentalOffers(rentals.size());
        response.setAcceptedOffers(countAccepted(rentals));
        response.setAcceptanceRate(acceptance.getValue());
        response.setAcceptanceRateUnavailableReason(acceptance.getUnavailableReason());
        response.setTenantsHosted(countDistinctAcceptedTenants(rentals));
        response.setAverageTenancyMonths(averageTenancy.getValue());
        response.setAverageTenancyUnavailableReason(averageTenancy.getUnavailableReason());
        response.setRentCollected(sumAmounts(payments));
        response.setPaymentCount(payments.size());
        response.setOccupancyRate(occupancyPercent(occupiedMillis(rentals, period.getFrom(), period.getTo()),
                1, period.getFrom(), period.getTo()).setScale(1, RoundingMode.HALF_UP));
        response.setTotalViews(analyticsQueryRepository.countListingViews(listingId, period.getFrom(), period.getTo()));
        response.setUniqueViewers(analyticsQueryRepository.countDistinctListingViewers(listingId, period.getFrom(), period.getTo()));
        response.setDaysOnMarket(daysOnMarket.getValue());
        response.setDaysOnMarketUnavailableReason(daysOnMarket.getUnavailableReason());
        response.setMonthlyRent(buildMonthlyPaymentSeries(payments, period));
        response.setMonthlyOccupancy(buildMonthlyOccupancySeries(rentals, period));
        return response;
    }

    public AdminAnalyticsDTO getPlatformAnalytics(User actor, AnalyticsPeriod period) {
        requireAdmin(actor);
        Instant asOf = clock.instant();
        List<RentalRow> rentals = analyticsQueryRepository.findAllRentalRows();
        List<PaymentRow> payments = analyticsQueryRepository.findAllPaymentRows(period.getFrom(), period.getTo());
        TenantCounts tenants = tenantCounts(rentals, asOf);
        RentalCounts rentalCounts = rentalCounts(rentals, asOf);

        AdminAnalyticsDTO response = new AdminAnalyticsDTO();
        response.setAsOf(asOf);
        response.setCurrency(currency);
        response.setRegisteredUsers(analyticsQueryRepository.countAllUsers());
        response.setTotalListings(analyticsQueryRepository.countAllListings());
        response.setTotalRentCollected(analyticsQueryRepository.sumAllRecordedRentPayments());
        response.setPropertyOwners(analyticsQueryRepository.countDistinctListingOwners());
        response.setCurrentTenants(tenants.current());
        response.setExpiredTenants(tenants.expired());
        response.setTerminatedTenants(tenants.terminated());
        response.setBlockedUsers(analyticsQueryRepository.countUsersWithFlag(2));
        response.setTotalRentalOffers(rentals.size());
        response.setPendingRentals(countStatus(rentals, STATUS_PENDING));
        response.setTerminatedRentals(countStatus(rentals, STATUS_TERMINATED));
        response.setActiveRentals(rentalCounts.active());
        response.setUpcomingRentals(rentalCounts.upcoming());
        response.setExpiredRentals(rentalCounts.expired());
        response.setUnclassifiedRentals(rentalCounts.unclassified());
        response.setMonthlyRent(buildMonthlyPaymentSeries(payments, period));
        response.setMonthlyAcceptedOffers(buildMonthlyLifecycleSeries(
                rentals, period, RentalRow::acceptedAt));
        response.setMonthlyTerminations(buildMonthlyLifecycleSeries(
                rentals, period, RentalRow::terminatedAt));
        response.setMonthlyAverageDaysOnMarket(buildMonthlyDaysOnMarketSeries(rentals, period, asOf));
        return response;
    }

    private AnalyticsChartPointDTO buildChartPoint(String label, BigDecimal value) {
        AnalyticsChartPointDTO point = new AnalyticsChartPointDTO();
        point.setLabel(label);
        point.setValue(value);
        return point;
    }

    private AnalyticsValueDTO buildAnalyticsValue(BigDecimal value, String unavailableReason) {
        AnalyticsValueDTO result = new AnalyticsValueDTO();
        result.setValue(value);
        result.setUnavailableReason(unavailableReason);
        return result;
    }

    private static Instant parseInstant(String name, String value) {
        try {
            return OffsetDateTime.parse(value.trim()).toInstant();
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("'" + name + "' must be an ISO-8601 date-time with an offset, e.g. 2026-01-01T00:00:00+08:00.");
        }
    }

    private void requireAdmin(User user) {
        if (user == null || !user.isAdmin()) {
            throw new SecurityException("You do not have access to platform analytics.");
        }
    }

    // Shared metrics

    private AnalyticsValueDTO calculateAverageTenancy(List<RentalRow> rentals) {
        List<BigDecimal> durations = tenancyDurations(rentals);
        if (durations.isEmpty()) {
            return buildAnalyticsValue(null, "No accepted rentals with valid start and end dates.");
        }
        BigDecimal sum = durations.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return buildAnalyticsValue(sum.divide(BigDecimal.valueOf(durations.size()), 1, RoundingMode.HALF_UP), null);
    }

    private List<AnalyticsChartPointDTO> buildMonthlyPaymentSeries(List<PaymentRow> payments, AnalyticsPeriod period) {
        Map<String, Long> totals = new LinkedHashMap<>();
        buildMonthlyDateRanges(period).forEach(range -> totals.put(range.label(), 0L));
        for (PaymentRow payment : payments) {
            String month = YearMonth.from(payment.date().toInstant().atZone(zone)).toString();
            totals.computeIfPresent(month, (key, total) -> total + nullToZero(payment.amount()));
        }
        return totals.entrySet().stream()
                .map(entry -> buildChartPoint(entry.getKey(), BigDecimal.valueOf(entry.getValue())))
                .toList();
    }

    private List<AnalyticsStatusPointDTO> buildMonthlyOccupancySeries(List<RentalRow> rentals, AnalyticsPeriod period) {
        List<AnalyticsStatusPointDTO> points = new ArrayList<>();
        for (MonthlyDateRange range : buildMonthlyDateRanges(period)) {
            boolean occupied = rentals.stream()
                    .filter(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())))
                    .filter(rental -> rental.rentalDate() != null && rental.tenancyEnd() != null)
                    .anyMatch(rental -> rental.rentalDate().toInstant().isBefore(range.to())
                            && rental.tenancyEnd().toInstant().isAfter(range.from()));
            AnalyticsStatusPointDTO point = new AnalyticsStatusPointDTO();
            point.setLabel(range.label());
            point.setStatus(occupied ? "occupied" : "vacant");
            points.add(point);
        }
        return points;
    }

    private List<AnalyticsChartPointDTO> buildTenancyDistribution(List<RentalRow> rentals) {
        long[] counts = new long[TENANCY_BUCKET_LABELS.length];
        for (BigDecimal months : tenancyDurations(rentals)) {
            int bucket = 0;
            while (bucket < TENANCY_BUCKET_BOUNDS.length && months.compareTo(BigDecimal.valueOf(TENANCY_BUCKET_BOUNDS[bucket])) >= 0) {
                bucket++;
            }
            counts[bucket]++;
        }
        List<AnalyticsChartPointDTO> points = new ArrayList<>();
        for (int i = 0; i < counts.length; i++) {
            points.add(buildChartPoint(TENANCY_BUCKET_LABELS[i], BigDecimal.valueOf(counts[i])));
        }
        return points;
    }

    private List<AnalyticsChartPointDTO> buildMonthlyOccupancyRateSeries(List<RentalRow> rentals, long listingCount, AnalyticsPeriod period) {
        if (listingCount == 0) {
            return null;
        }
        List<AnalyticsChartPointDTO> points = new ArrayList<>();
        for (MonthlyDateRange range : buildMonthlyDateRanges(period)) {
            BigDecimal rate = occupancyPercent(
                    occupiedMillis(rentals, range.from(), range.to()),
                    listingCount, range.from(), range.to());
            points.add(buildChartPoint(range.label(), rate.setScale(1, RoundingMode.HALF_UP)));
        }
        return points;
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

    // Accepted offers and terminations

    private List<AnalyticsChartPointDTO> buildMonthlyLifecycleSeries(List<RentalRow> rentals, AnalyticsPeriod period,
                                                                    Function<RentalRow, Date> dateOf) {
        return buildMonthlyDateRanges(period).stream()
                .map(range -> buildChartPoint(range.label(),
                        BigDecimal.valueOf(countInRange(rentals, dateOf, range.from(), range.to()))))
                .toList();
    }

    private List<AnalyticsChartPointDTO> buildMonthlyDaysOnMarketSeries(List<RentalRow> rentals, AnalyticsPeriod period, Instant asOf) {
        return buildMonthlyDateRanges(period).stream().map(range -> {
            AnalyticsPeriod month = new AnalyticsPeriod();
            month.setFrom(range.from());
            month.setTo(range.to());
            AnalyticsValueDTO average = averageDaysOnMarket(rentals, month, asOf);
            return buildChartPoint(range.label(), average.getValue());
        }).toList();
    }

    private record MonthlyDateRange(String label, Instant from, Instant to) {}

    private List<MonthlyDateRange> buildMonthlyDateRanges(AnalyticsPeriod period) {
        YearMonth firstMonth = YearMonth.from(period.getFrom().atZone(zone));
        YearMonth lastMonth = YearMonth.from(
                period.getTo().minusNanos(1).atZone(zone));

        List<MonthlyDateRange> ranges = new ArrayList<>();

        for (YearMonth month = firstMonth;
             !month.isAfter(lastMonth);
             month = month.plusMonths(1)) {
            Instant start = max(
                    month.atDay(1).atStartOfDay(zone).toInstant(),
                    period.getFrom());
            Instant end = min(
                    month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant(),
                    period.getTo());

            ranges.add(new MonthlyDateRange(month.toString(), start, end));
        }

        return ranges;
    }

    private AnalyticsValueDTO averageDaysOnMarket(List<RentalRow> rentals, AnalyticsPeriod period, Instant asOf) {
        Map<Long, List<RentalRow>> byListing = new LinkedHashMap<>();
        rentals.forEach(rental -> byListing.computeIfAbsent(rental.listingId(), id -> new ArrayList<>()).add(rental));
        List<BigDecimal> days = new ArrayList<>();
        for (List<RentalRow> history : byListing.values()) {
            Optional<Instant> accepted = firstAcceptedAt(history);
            if (accepted.isEmpty() || accepted.get().isBefore(period.getFrom()) || !accepted.get().isBefore(period.getTo())) continue;
            AnalyticsValueDTO duration = listingDaysOnMarket(history.getFirst().listingCreatedAt(), history, asOf);
            if (duration.getValue() != null) days.add(duration.getValue());
        }
        if (days.isEmpty()) {
            return buildAnalyticsValue(null, "No first accepted offers with valid publication and acceptance dates in this period.");
        }
        BigDecimal sum = days.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return buildAnalyticsValue(sum.divide(BigDecimal.valueOf(days.size()), 1, RoundingMode.HALF_UP), null);
    }

    private AnalyticsValueDTO listingDaysOnMarket(Date publishedAt, List<RentalRow> rentals, Instant asOf) {
        if (publishedAt == null) {
            return buildAnalyticsValue(null, "The publication date was not recorded for this listing.");
        }
        if (hasUndatedAcceptance(rentals)) {
            return buildAnalyticsValue(null, "An accepted offer has no recorded acceptance date, so the first acceptance cannot be determined.");
        }
        Optional<Instant> firstAccepted = firstAcceptedAt(rentals);
        if (firstAccepted.isEmpty()) {
            return buildAnalyticsValue(null, "No rental offer has been accepted yet. Days on market will be available after acceptance.");
        }
        Instant listed = publishedAt.toInstant();
        Instant end = firstAccepted.get();
        if (end.isBefore(listed)) {
            return buildAnalyticsValue(null, "The recorded acceptance is earlier than the recorded publish date.");
        }
        if (end.isAfter(asOf)) {
            return buildAnalyticsValue(null, "The recorded acceptance date is in the future.");
        }
        return buildAnalyticsValue(daysBetween(listed, end), null);
    }

    private static Optional<Instant> firstAcceptedAt(List<RentalRow> rentals) {
        return rentals.stream().map(RentalRow::acceptedAt).filter(Objects::nonNull)
                .map(Date::toInstant).min(Comparator.naturalOrder());
    }

    private static boolean hasUndatedAcceptance(List<RentalRow> rentals) {
        return rentals.stream().anyMatch(rental -> ACCEPTED_STATUSES.contains(normalise(rental.status())) && rental.acceptedAt() == null);
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

    // Calculation helpers

    private AnalyticsValueDTO rate(long numerator, long denominator) {
        if (denominator == 0) {
            return buildAnalyticsValue(null, "No rental records, so the acceptance rate cannot be calculated.");
        }
        BigDecimal value = BigDecimal.valueOf(numerator * 100)
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
        return buildAnalyticsValue(value, null);
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

    record TenantCounts(long current, long expired, long terminated) {}

    record RentalCounts(long active, long upcoming, long expired, long unclassified) {}

    static RentalCounts rentalCounts(List<RentalRow> rentals, Instant asOf) {
        long active = 0, upcoming = 0, expired = 0, unclassified = 0;
        for (RentalRow rental : rentals) {
            String status = normalise(rental.status());
            if (STATUS_PENDING.equals(status) || STATUS_TERMINATED.equals(status)) continue;
            if (!STATUS_ACTIVE.equals(status) || rental.rentalDate() == null || rental.tenancyEnd() == null
                    || !rental.rentalDate().before(rental.tenancyEnd())) {
                unclassified++;
            } else if (!rental.tenancyEnd().toInstant().isAfter(asOf)) {
                // An active row with a termination timestamp is inconsistent, not a natural expiry.
                if (rental.terminatedAt() == null) expired++;
                else unclassified++;
            } else if (rental.rentalDate().toInstant().isAfter(asOf)) {
                upcoming++;
            } else {
                active++;
            }
        }
        return new RentalCounts(active, upcoming, expired, unclassified);
    }

    static TenantCounts tenantCounts(List<RentalRow> rentals, Instant asOf) {
        Set<Long> current = new java.util.HashSet<>();
        Map<Long, RentalRow> latestEnded = new HashMap<>();
        for (RentalRow rental : rentals) {
            if (rental.tenantUserId() == null || rental.rentalDate() == null || rental.tenancyEnd() == null) continue;
            Instant start = rental.rentalDate().toInstant();
            Instant end = rental.tenancyEnd().toInstant();
            String status = normalise(rental.status());
            if (!start.isBefore(end)) continue;
            if (STATUS_ACTIVE.equals(status) && !start.isAfter(asOf) && end.isAfter(asOf)) {
                current.add(rental.tenantUserId());
            } else if (ACCEPTED_STATUSES.contains(status) && !end.isAfter(asOf)) {
                latestEnded.merge(rental.tenantUserId(), rental, (previous, next) -> {
                    int order = next.tenancyEnd().compareTo(previous.tenancyEnd());
                    return order > 0 || (order == 0 && wasTerminated(next)) ? next : previous;
                });
            }
        }
        current.forEach(latestEnded::remove);
        long terminated = latestEnded.values().stream().filter(AnalyticsService::wasTerminated).count();
        return new TenantCounts(current.size(), latestEnded.size() - terminated, terminated);
    }

    private static boolean wasTerminated(RentalRow rental) {
        return STATUS_TERMINATED.equals(normalise(rental.status())) || rental.terminatedAt() != null;
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
