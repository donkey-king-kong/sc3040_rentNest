package RentNest.dto.analytics;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * A single analytics value. A measured zero is "available" with value 0;
 * a metric that cannot be calculated is "unavailable" with a null value and a reason.
 *
 * Metrics built on lifecycle timestamps also carry {@code coverage}: those dates are only recorded
 * from the moment tracking started, so a period reaching back before then is only partly covered.
 */
public record Metric(
        String availability,
        Object value,
        String unit,
        String basis,
        String definition,
        String reason,
        @JsonInclude(JsonInclude.Include.NON_NULL) Coverage coverage
) {
    public static final String AVAILABLE = "available";
    public static final String UNAVAILABLE = "unavailable";
    public static final String SNAPSHOT = "snapshot";
    public static final String PERIOD = "period";

    /** The part of the requested period the data actually covers. {@code complete} is false when tracking began mid-period. */
    public record Coverage(Instant start, Instant end, boolean complete) {
    }

    public static Metric available(Object value, String unit, String basis, String definition) {
        return new Metric(AVAILABLE, value, unit, basis, definition, null, null);
    }

    public static Metric unavailable(String unit, String basis, String definition, String reason) {
        return new Metric(UNAVAILABLE, null, unit, basis, definition, reason, null);
    }

    public Metric withCoverage(Coverage coverage) {
        return new Metric(availability, value, unit, basis, definition, reason, coverage);
    }
}
