package RentNest.dto.analytics;

/**
 * A single analytics value. A measured zero is "available" with value 0;
 * a metric that cannot be calculated is "unavailable" with a null value and a reason.
 */
public record Metric(
        String availability,
        Object value,
        String unit,
        String basis,
        String definition,
        String reason
) {
    public static final String AVAILABLE = "available";
    public static final String UNAVAILABLE = "unavailable";
    public static final String SNAPSHOT = "snapshot";
    public static final String PERIOD = "period";

    public static Metric available(Object value, String unit, String basis, String definition) {
        return new Metric(AVAILABLE, value, unit, basis, definition, null);
    }

    public static Metric unavailable(String unit, String basis, String definition, String reason) {
        return new Metric(UNAVAILABLE, null, unit, basis, definition, reason);
    }
}
