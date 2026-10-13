package RentNest.service;

public class AiChatProviderException extends RuntimeException {
    public enum Kind {
        TIMEOUT,
        RATE_LIMIT,
        UNAVAILABLE,
        INVALID_RESPONSE
    }

    private final Kind kind;
    private final boolean retryable;

    public AiChatProviderException(Kind kind, String message, boolean retryable) {
        super(message);
        this.kind = kind;
        this.retryable = retryable;
    }

    public AiChatProviderException(Kind kind, String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.retryable = retryable;
    }

    public Kind getKind() {
        return kind;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
