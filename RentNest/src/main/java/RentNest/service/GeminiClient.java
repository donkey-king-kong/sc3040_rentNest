package RentNest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Minimal client for Google Gemini's generateContent REST endpoint, shared by the
 * AI Fair-Pricing Model's LLM features (price explanations, room-type detection).
 *
 * Uses the app's shared Gemini key (llm.api-key, or GEMINI_API_KEY as a fallback) and
 * its own model setting, pricing.ai.model, so the AI chat's model is unaffected. When no key is set,
 * {@link #isConfigured()} is false and callers fall back to non-AI behaviour.
 */
@Service
public class GeminiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    public enum Operation { PRICE_EXPLANATION, ROOM_CLASSIFICATION, UNSPECIFIED }

    /**
     * A fast "lite" model: room detection and the short price explanation are simple
     * tasks. Measured Oct 2026: about 1 s per call vs about 10 s for gemini-3.8-flash,
     * with consistent room-type answers.
     */
    public static final String DEFAULT_MODEL = "gemini-3.1-flash-lite";
    static final String GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    private final String apiKey;
    private final String model;

    /** Text of a successful reply, or a user-facing error message. */
    public record Reply(String text, String error) {
        public boolean ok() { return text != null; }
        static Reply of(String text) { return new Reply(text, null); }
        static Reply failed(String error) { return new Reply(null, error); }
    }

    /** Placeholder from application.properties.example, treated as "no key". */
    static final String KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY";

    public GeminiClient(@Value("${llm.api-key:${GEMINI_API_KEY:}}") String apiKey,
                        @Value("${pricing.ai.model:" + DEFAULT_MODEL + "}") String model) {
        String key = apiKey == null ? "" : apiKey.trim();
        this.apiKey = KEY_PLACEHOLDER.equals(key) ? "" : key;
        this.model = model == null || model.isBlank() ? DEFAULT_MODEL : model.trim();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    public String getModel() {
        return model;
    }

    /**
     * Send one system instruction and one user message.
     *
     * @param responseSchema optional Gemini response schema; when given, the reply is JSON matching it
     */
    public Reply generate(String systemPrompt, String userPrompt, int maxOutputTokens, JsonNode responseSchema) {
        return generate(Operation.UNSPECIFIED, systemPrompt, userPrompt, maxOutputTokens, responseSchema);
    }

    public Reply generate(Operation operation, String systemPrompt, String userPrompt,
                          int maxOutputTokens, JsonNode responseSchema) {
        long started = System.nanoTime();
        String requestId = MDC.get("pricingRequestId");
        String listingId = MDC.get("pricingListingId");
        if (!isConfigured()) {
            log.warn("[PricingAI] event=provider_skipped requestId={} listingId={} operation={} model={} reason=not_configured",
                    requestId, listingId, operation, model);
            return Reply.failed("AI is not configured on the server (llm.api-key is not set).");
        }
        log.info("[PricingAI] event=provider_started requestId={} listingId={} operation={} model={}",
                requestId, listingId, operation, model);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);
        try {
            ResponseEntity<String> response = restTemplate.exchange(GENERATE_URL, HttpMethod.POST,
                    new HttpEntity<>(buildRequestBody(systemPrompt, userPrompt, maxOutputTokens, responseSchema), headers),
                    String.class, model);
            Reply reply = parseReply(response.getBody());
            if (reply.ok()) {
                log.info("[PricingAI] event=provider_completed requestId={} listingId={} operation={} model={} httpStatus={} available=true durationMs={}",
                        requestId, listingId, operation, model, response.getStatusCode().value(), elapsedMs(started));
            } else {
                log.warn("[PricingAI] event=provider_completed requestId={} listingId={} operation={} model={} httpStatus={} available=false durationMs={} reason={}",
                        requestId, listingId, operation, model, response.getStatusCode().value(), elapsedMs(started), reply.error());
            }
            return reply;
        } catch (HttpStatusCodeException e) {
            log.warn("[PricingAI] event=provider_failed requestId={} listingId={} operation={} model={} httpStatus={} durationMs={} {}",
                    requestId, listingId, operation, model, e.getStatusCode().value(), elapsedMs(started),
                    safeProviderError(e.getResponseBodyAsString()));
            if (e.getStatusCode().value() == 429) {
                return Reply.failed("The AI service is busy. Please try again in a minute.");
            }
            return Reply.failed("The AI service returned an error (HTTP " + e.getStatusCode().value() + ").");
        } catch (ResourceAccessException e) {
            log.warn("[PricingAI] event=provider_failed requestId={} listingId={} operation={} model={} httpStatus=none durationMs={} reason=transport_error errorType={}",
                    requestId, listingId, operation, model, elapsedMs(started),
                    e.getMostSpecificCause().getClass().getSimpleName());
            return Reply.failed("Could not reach the AI service.");
        }
    }

    private static long elapsedMs(long started) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }

    // Provider messages can echo credentials or listing text. Log only recognized
    // status values and derived categories, never arbitrary messages or metadata.
    private static String safeProviderError(String body) {
        if (body == null || body.length() > 65536) return "providerDetails=omitted";
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode error = root == null ? objectMapper.missingNode() : root.path("error");
            String status = error.path("status").asText("");
            if (!Set.of("UNAVAILABLE", "RESOURCE_EXHAUSTED", "INVALID_ARGUMENT", "NOT_FOUND",
                    "PERMISSION_DENIED", "UNAUTHENTICATED", "INTERNAL", "DEADLINE_EXCEEDED").contains(status)) {
                status = "UNKNOWN";
            }
            String message = error.path("message").asText("").toLowerCase(Locale.ROOT);
            String reason = "unspecified";
            if (message.contains("high demand") || message.contains("overload")) reason = "high_demand";
            else if (message.contains("quota") || message.contains("rate limit")) reason = "quota_or_rate_limit";
            else if (message.contains("api key") || message.contains("permission")) reason = "credentials_or_permissions";
            else if (message.contains("model") && (message.contains("not found") || message.contains("not supported"))) reason = "model_unavailable";
            else if (message.contains("unavailable")) reason = "service_unavailable";
            String code = error.path("code").isInt() ? Integer.toString(error.path("code").intValue()) : "unknown";
            return "providerCode=" + code + " providerStatus=" + status + " providerReason=" + reason;
        } catch (IOException e) {
            return "providerDetails=unreadable";
        }
    }

    static String buildRequestBody(String systemPrompt, String userPrompt, int maxOutputTokens, JsonNode responseSchema) {
        ObjectNode body = objectMapper.createObjectNode();
        body.putObject("systemInstruction").putArray("parts").addObject().put("text", systemPrompt);
        ObjectNode user = body.putArray("contents").addObject();
        user.put("role", "user");
        user.putArray("parts").addObject().put("text", userPrompt);
        ObjectNode config = body.putObject("generationConfig");
        config.put("maxOutputTokens", maxOutputTokens);
        if (responseSchema != null) {
            config.put("responseMimeType", "application/json");
            config.set("responseSchema", responseSchema);
        }
        return body.toString();
    }

    /** Extract the answer text from a generateContent response, handling blocked or empty replies. */
    public static Reply parseReply(String json) {
        JsonNode root;
        try {
            root = objectMapper.readTree(json == null ? "" : json);
        } catch (IOException e) {
            return Reply.failed("The AI service returned an unreadable response.");
        }
        if (root == null || root.isMissingNode()) {
            return Reply.failed("The AI returned an empty response.");
        }
        if (root.path("promptFeedback").hasNonNull("blockReason")) {
            return Reply.failed("The AI declined to answer this request.");
        }
        JsonNode candidate = root.path("candidates").path(0);
        String finish = candidate.path("finishReason").asText("");
        if (finish.equals("SAFETY") || finish.equals("PROHIBITED_CONTENT") || finish.equals("BLOCKLIST")) {
            return Reply.failed("The AI declined to answer this request.");
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (part.path("thought").asBoolean(false)) continue;
            text.append(part.path("text").asText(""));
        }
        String out = text.toString().trim();
        return out.isEmpty() ? Reply.failed("The AI returned an empty response.") : Reply.of(out);
    }
}
