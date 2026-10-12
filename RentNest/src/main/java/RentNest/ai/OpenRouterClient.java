package RentNest.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Minimal OpenRouter chat-completions client.
 *
 * <p>The API key never leaves the backend: the Expo app calls RentNest, RentNest calls
 * OpenRouter. Every failure is normalised to {@link AiUnavailableException} so callers
 * only need one catch block to fall back.
 */
@Component
public class OpenRouterClient {
    private static final Logger log = LoggerFactory.getLogger(OpenRouterClient.class);

    private final AiProperties properties;
    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient client;

    public OpenRouterClient(AiProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        this.client = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    /** False when AI is switched off or no key is configured; callers then skip the call entirely. */
    public boolean isEnabled() {
        return properties.isEnabled() && properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    /**
     * Requests a reply constrained to {@code schema} and returns it parsed.
     *
     * @param schema a JSON Schema document; OpenRouter requires {@code additionalProperties}
     *               to be set explicitly and routes only to providers that support it.
     */
    public JsonNode completeJson(String model, String system, String user, String schemaName,
                                 String schema, int maxTokens) {
        ObjectNode format = mapper.createObjectNode();
        format.put("type", "json_schema");
        ObjectNode jsonSchema = format.putObject("json_schema");
        jsonSchema.put("name", schemaName);
        jsonSchema.put("strict", true);
        try {
            jsonSchema.set("schema", mapper.readTree(schema));
        } catch (Exception e) {
            throw new AiUnavailableException("Malformed JSON schema for " + schemaName, e);
        }
        String content = complete(model, system, user, maxTokens, format);
        try {
            return mapper.readTree(stripCodeFence(content));
        } catch (Exception e) {
            throw new AiUnavailableException("Model reply for " + schemaName + " was not valid JSON", e);
        }
    }

    /** Requests free-form prose. Used for listing summaries, where no schema is needed. */
    public String completeText(String model, String system, String user, int maxTokens) {
        return complete(model, system, user, maxTokens, null).trim();
    }

    private String complete(String model, String system, String user, int maxTokens, ObjectNode responseFormat) {
        if (!isEnabled()) throw new AiUnavailableException("OpenRouter is disabled or no API key is configured");

        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", maxTokens);
        // Deterministic output keeps repeated searches and cached summaries stable.
        body.put("temperature", 0);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", system);
        messages.addObject().put("role", "user").put("content", user);
        if (responseFormat != null) {
            body.set("response_format", responseFormat);
            // Route only to providers that honour the schema rather than silently ignoring it.
            body.putObject("provider").put("require_parameters", true);
        }

        String raw;
        try {
            raw = client.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .header("HTTP-Referer", properties.getAppUrl())
                    .header("X-Title", properties.getAppName())
                    .body(body.toString())
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("OpenRouter request to {} failed: {}", model, e.toString());
            throw new AiUnavailableException("OpenRouter request failed", e);
        }

        try {
            JsonNode parsed = mapper.readTree(raw);
            if (parsed.hasNonNull("error"))
                throw new AiUnavailableException("OpenRouter error: " + parsed.get("error").path("message").asText());
            JsonNode content = parsed.path("choices").path(0).path("message").path("content");
            if (!content.isTextual() || content.asText().isBlank())
                throw new AiUnavailableException("OpenRouter returned an empty completion");
            return content.asText();
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            throw new AiUnavailableException("Could not read the OpenRouter response", e);
        }
    }

    /** Some models wrap JSON in a Markdown fence even under a schema; unwrap before parsing. */
    private static String stripCodeFence(String value) {
        String trimmed = value.trim();
        if (!trimmed.startsWith("```")) return trimmed;
        int firstLineEnd = trimmed.indexOf('\n');
        int closing = trimmed.lastIndexOf("```");
        if (firstLineEnd < 0 || closing <= firstLineEnd) return trimmed;
        return trimmed.substring(firstLineEnd + 1, closing).trim();
    }
}
