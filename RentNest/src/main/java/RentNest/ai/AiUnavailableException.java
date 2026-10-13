package RentNest.ai;

/**
 * Raised whenever a model call cannot be completed or cannot be trusted: no API key, a
 * transport failure, a timeout, a non-2xx response, or a reply that does not parse.
 * Callers are expected to catch this and fall back to their deterministic path, so a
 * model outage degrades search quality but never breaks it.
 */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message) { super(message); }
    public AiUnavailableException(String message, Throwable cause) { super(message, cause); }
}
