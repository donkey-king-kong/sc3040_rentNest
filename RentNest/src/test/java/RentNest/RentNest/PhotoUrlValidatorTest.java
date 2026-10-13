package RentNest.RentNest;

import RentNest.service.PhotoUrlValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PhotoUrlValidatorTest {
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\r\n", "\u2003\u00a0"})
    void absentOrBlankNormalizesToNull(String value) {
        assertNull(PhotoUrlValidator.normalize(value));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://example.com/photo", "https://example.com", "HTTPS://EXAMPLE.COM/photo",
            "https://example.com:8443/a%20b?size=1&token=a+b%2Fc%25#preview",
            "https://127.0.0.1/photo", "http://[::1]/photo"
    })
    void validUrlPreservesEncodingAndCase(String value) {
        assertEquals(value, PhotoUrlValidator.normalize(" \t" + value + "\r\n\u00a0"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/photo.jpg", "//example.com/photo", "ftp://example.com/photo",
            "data:image/png;base64,abc", "javascript:alert(1)", "https:photo",
            "https:///photo", "https://", "https://bad_host/photo", "https://-bad.com/photo",
            "https://example.com:bad/photo", "https://user@example.com/photo",
            "https://user:password@example.com/photo", "https://@example.com/photo",
            "https://example.com/a%", "https://example.com/a%2", "https://example.com/a%GG",
            "https://example.com/a b", "https://example.com/a\tb", "https://example.com/a\nb",
            "https://example.com/a\u00a0b", "https://example.com/a\u2003b",
            "https://example.com/\\photo", "https://example.com/a\u0000b"
    })
    void invalidUrlHasReadableError(String value) {
        var error = assertThrows(IllegalArgumentException.class, () -> PhotoUrlValidator.normalize(value));
        assertEquals(PhotoUrlValidator.INVALID_MESSAGE, error.getMessage());
    }

    @Test
    void lengthLimitAppliesAfterTrimmingWithoutTruncation() {
        String prefix = "https://example.com/";
        String maximum = prefix + "a".repeat(255 - prefix.length());
        assertEquals(255, maximum.length());
        assertEquals(maximum, PhotoUrlValidator.normalize("  " + maximum + "  "));
        assertThrows(IllegalArgumentException.class, () -> PhotoUrlValidator.normalize(maximum + "a"));
    }
}
