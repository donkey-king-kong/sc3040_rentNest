package RentNest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

/**
 * Minimal client for Google Gemini's generateContent REST endpoint, shared by the
 * AI Fair-Pricing Model's LLM features (price explanations, room-type detection).
 *
 * Configured with GEMINI_API_KEY and optionally GEMINI_MODEL; when no key is set,
 * {@link #isConfigured()} is false and callers fall back to non-AI behaviour.
 */
@Service
public class GeminiClient {

    public static final String DEFAULT_MODEL = "gemini-3.8-flash";
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

    public GeminiClient(@Value("${GEMINI_API_KEY:}") String apiKey,
                        @Value("${GEMINI_MODEL:" + DEFAULT_MODEL + "}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
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
        if (!isConfigured()) {
            return Reply.failed("AI is not configured on the server (GEMINI_API_KEY is not set).");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);
        try {
            ResponseEntity<String> response = restTemplate.exchange(GENERATE_URL, HttpMethod.POST,
                    new HttpEntity<>(buildRequestBody(systemPrompt, userPrompt, maxOutputTokens, responseSchema), headers),
                    String.class, model);
            return parseReply(response.getBody());
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 429) {
                return Reply.failed("The AI service is busy. Please try again in a minute.");
            }
            return Reply.failed("The AI service returned an error (HTTP " + e.getStatusCode().value() + ").");
        } catch (ResourceAccessException e) {
            return Reply.failed("Could not reach the AI service.");
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
