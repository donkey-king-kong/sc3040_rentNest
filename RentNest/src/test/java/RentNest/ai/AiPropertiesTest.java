package RentNest.ai;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySource;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The nested settings groups are exposed through getters only. If Spring ever stopped
 * binding those, every model and limit would silently fall back to its default, which is
 * the kind of failure nothing else would surface.
 */
class AiPropertiesTest {

    private AiProperties bind(Map<String, Object> values) {
        ConfigurationPropertySource source = new MapConfigurationPropertySource(values);
        return new Binder(source).bindOrCreate("rentnest.ai", AiProperties.class);
    }

    @Test void bindsNestedSettingsFromApplicationProperties() {
        AiProperties properties = bind(Map.of(
                "rentnest.ai.api-key", "sk-or-test",
                "rentnest.ai.read-timeout-ms", "4500",
                "rentnest.ai.filter.model", "openai/gpt-5-nano",
                "rentnest.ai.sorting.candidates", "7",
                "rentnest.ai.sorting.enabled", "false",
                "rentnest.ai.summary.include-amenities", "true",
                "rentnest.ai.summary.amenity-radius-meters", "750"));

        assertEquals("sk-or-test", properties.getApiKey());
        assertEquals(4500, properties.getReadTimeoutMs());
        assertEquals("openai/gpt-5-nano", properties.getFilter().getModel());
        assertEquals(7, properties.getSorting().getCandidates());
        assertFalse(properties.getSorting().isEnabled());
        assertTrue(properties.getSummary().isIncludeAmenities());
        assertEquals(750, properties.getSummary().getAmenityRadiusMeters());
    }

    @Test void defaultsLeaveEveryFeatureOffUntilAKeyIsConfigured() {
        AiProperties properties = bind(Map.of());

        assertTrue(properties.isEnabled(), "the feature switch defaults on");
        assertEquals("", properties.getApiKey());
        assertFalse(new OpenRouterClient(properties).isEnabled(),
                "no key must mean no model calls, whatever the feature switches say");
        assertFalse(properties.getSummary().isIncludeAmenities(),
                "the slow government-data lookups must stay off by default");
        assertEquals(20, properties.getSorting().getCandidates());
    }
}
