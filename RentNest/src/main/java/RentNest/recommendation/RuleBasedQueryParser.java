package RentNest.recommendation;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Regex extraction of budget, bedrooms, property type and location from search text.
 *
 * <p>This is the fallback for {@link AiQueryParser}: it runs when AI is disabled, when no
 * API key is configured, and whenever a model call fails or times out. Keeping it means a
 * model outage costs search quality, not search itself.
 */
@Component
public class RuleBasedQueryParser {
    private static final String MONEY = "(?:s\\$|\\$)?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?k?)";
    private static final Pattern MAX = Pattern.compile("\\b(?:under|below|up to|max(?:imum)?(?: budget)?|budget(?: of)?)\\s*" + MONEY);
    private static final Pattern MIN = Pattern.compile("\\b(?:over|above|at least|min(?:imum)?(?: budget)?)\\s*" + MONEY);
    private static final Pattern BEDS = Pattern.compile("\\b(\\d+)\\s*[- ]?\\s*(?:bed(?:room)?s?)\\b");
    private static final Pattern TYPE = Pattern.compile("\\b(hdb|condo(?:minium)?|landed)\\b");
    private static final Pattern FILLER = Pattern.compile(
            "\\b(?:looking for|show me|find me|i want|per month|a month|monthly|rent|rental|please|with|in|at|a|an|and|or)\\b");

    public ParsedQuery parse(String query) {
        String text = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (text.isEmpty()) return ParsedQuery.empty(ParsedQuery.RULES);

        Matcher maxMatcher = MAX.matcher(text);
        Integer maxPrice = maxMatcher.find() ? money(maxMatcher.group(1)) : null;
        Matcher minMatcher = MIN.matcher(text);
        Integer minPrice = minMatcher.find() ? money(minMatcher.group(1)) : null;
        Matcher bedsMatcher = BEDS.matcher(text);
        Integer minBeds = bedsMatcher.find() ? money(bedsMatcher.group(1)) : null;

        List<String> types = new ArrayList<>();
        Matcher typeMatcher = TYPE.matcher(text);
        while (typeMatcher.find()) {
            String type = Normalize.type(typeMatcher.group(1));
            if (!types.contains(type)) types.add(type);
        }

        // Whatever is left once the recognised phrases are removed is treated as location text.
        String location = MAX.matcher(text).replaceAll(" ");
        location = MIN.matcher(location).replaceAll(" ");
        location = BEDS.matcher(location).replaceAll(" ");
        location = TYPE.matcher(location).replaceAll(" ");
        location = FILLER.matcher(location).replaceAll(" ").replaceAll("\\s+", " ").trim();

        // Regex extraction can only ever produce the one leftover phrase.
        List<String> locations = location.isEmpty() ? List.of() : List.of(location);
        return new ParsedQuery(minPrice, maxPrice, minBeds, List.copyOf(types), locations, "", ParsedQuery.RULES);
    }

    static Integer money(String value) {
        try {
            double amount = Double.parseDouble(value.replace(",", "").replace("k", "")) * (value.endsWith("k") ? 1000 : 1);
            if (!Double.isFinite(amount) || amount > Integer.MAX_VALUE || amount != Math.floor(amount))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid budget or bedroom count");
            return (int) amount;
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid budget or bedroom count");
        }
    }
}
