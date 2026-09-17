package RentNest.dto.analytics;

import java.util.List;

/**
 * An ordered set of bucketed values, used for trends (monthly buckets) and distributions.
 */
public record Series(
        String availability,
        String unit,
        String basis,
        String definition,
        String reason,
        List<Point> points
) {
    public record Point(String bucket, Object value) {
    }

    public static Series available(String unit, String basis, String definition, List<Point> points) {
        return new Series(Metric.AVAILABLE, unit, basis, definition, null, points);
    }

    public static Series unavailable(String unit, String basis, String definition, String reason) {
        return new Series(Metric.UNAVAILABLE, unit, basis, definition, reason, List.of());
    }
}
