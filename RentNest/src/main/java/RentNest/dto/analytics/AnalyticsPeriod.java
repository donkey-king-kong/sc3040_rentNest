package RentNest.dto.analytics;

import java.time.Instant;

/**
 * A validated reporting period, normalised to UTC instants, applied as [from, to).
 */
public record AnalyticsPeriod(Instant from, Instant to, String boundary, String timeZone) {
    public static final String BOUNDARY = "[from,to)";
}
