package RentNest.dto.analytics;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Response envelope for all analytics endpoints.
 * Snapshot metrics describe state at {@code asOf} and ignore the period;
 * period metrics only count records dated within {@code period}.
 */
public record AnalyticsResponse(
        int schemaVersion,
        String scope,
        Instant asOf,
        AnalyticsPeriod period,
        @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, Object> listing,
        Map<String, Metric> metrics,
        Map<String, Series> series
) {
    public static final int SCHEMA_VERSION = 1;
}
