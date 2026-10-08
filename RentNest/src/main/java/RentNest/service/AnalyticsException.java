package RentNest.service;

import org.springframework.http.HttpStatus;

public class AnalyticsException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AnalyticsException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AnalyticsException invalidPeriod(String message) {
        return new AnalyticsException(HttpStatus.BAD_REQUEST, "INVALID_PERIOD", message);
    }

    // Same response for foreign and nonexistent listings, so existence is not leaked
    public static AnalyticsException listingNotFound() {
        return new AnalyticsException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Listing not found.");
    }

    public static AnalyticsException forbidden() {
        return new AnalyticsException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to platform analytics.");
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
