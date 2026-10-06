package RentNest.dto.analytics;

import java.time.Instant;

/**
 * A validated reporting period, normalised to UTC instants, applied as [from, to).
 */
public record AnalyticsPeriod(Instant from, Instant to, String boundary, String timeZone, boolean lifetime) {
    public AnalyticsPeriod(Instant from, Instant to, String boundary, String timeZone) {
        this(from, to, boundary, timeZone, false);
    }
    public static final String BOUNDARY = "[from,to)";
}
