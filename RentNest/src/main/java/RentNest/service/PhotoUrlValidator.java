package RentNest.service;

import java.net.URI;
import java.net.URISyntaxException;

public final class PhotoUrlValidator {
    public static final int MAX_LENGTH = 255;
    public static final String INVALID_MESSAGE =
            "Photo URL must be an absolute HTTP or HTTPS URL with a valid host, "
            + "no credentials, whitespace, or malformed escapes, and at most 255 characters.";

    private PhotoUrlValidator() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        int start = 0;
        int end = value.length();
        while (start < end && isWhitespace(value.charAt(start))) {
            start++;
        }
        while (end > start && isWhitespace(value.charAt(end - 1))) {
            end--;
        }
        String normalized = value.substring(start, end);
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > MAX_LENGTH
                || normalized.codePoints().anyMatch(PhotoUrlValidator::isWhitespace)) {
            throw new IllegalArgumentException(INVALID_MESSAGE);
        }
        try {
            URI uri = new URI(normalized).parseServerAuthority();
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getRawUserInfo() != null) {
                throw new IllegalArgumentException(INVALID_MESSAGE);
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException(INVALID_MESSAGE);
        }
        return normalized;
    }

    private static boolean isWhitespace(int codePoint) {
        return Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint);
    }
}
