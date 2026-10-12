package RentNest.recommendation;

import java.util.Locale;

/** Shared lower-casing and property-type canonicalisation. */
final class Normalize {
    private Normalize() {}

    static String text(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    static String type(String value) {
        return text(value).replace("condominium", "condo");
    }
}
