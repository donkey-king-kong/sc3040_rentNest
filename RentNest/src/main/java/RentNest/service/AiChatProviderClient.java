package RentNest.service;

import RentNest.config.AiChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static RentNest.service.AiChatProviderException.Kind.INVALID_RESPONSE;
import static RentNest.service.AiChatProviderException.Kind.RATE_LIMIT;
import static RentNest.service.AiChatProviderException.Kind.TIMEOUT;
import static RentNest.service.AiChatProviderException.Kind.UNAVAILABLE;

@Component
public class AiChatProviderClient {
    private static final Logger log = LoggerFactory.getLogger(AiChatProviderClient.class);

    private final AiChatProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public AiChatProviderClient(AiChatProperties properties) {
        this(properties, HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.max(100, properties.getConnectTimeoutMs())))
                .build(), new ObjectMapper());
    }

    AiChatProviderClient(AiChatProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public Completion complete(
            String systemInstruction,
            String prompt,
            String operation,
            int messageCount,
            boolean jsonResponse) {
        try {
            return callModel(
                    properties.getModel(),
                    properties.getPrimaryTimeoutMs(),
                    systemInstruction,
                    prompt,
                    operation,
                    messageCount,
                    jsonResponse);
        } catch (AiChatProviderException primaryFailure) {
            if (!primaryFailure.isRetryable() || !hasFallbackModel()) {
                throw primaryFailure;
            }
            log.info("[AIChat] event=fallback_scheduled requestId={} operation={} primaryModel={} fallbackModel={} backoffMs={}",
                    requestId(), operation, properties.getModel(), properties.getFallbackModel(),
                    Math.max(0, properties.getRetryBackoffMs()));
            pauseBeforeFallback();
            return callModel(
                    properties.getFallbackModel(),
                    properties.getFallbackTimeoutMs(),
                    systemInstruction,
                    prompt,
                    operation,
                    messageCount,
                    jsonResponse);
        }
    }

    private Completion callModel(
            String model,
            int timeoutMs,
            String systemInstruction,
            String prompt,
            String operation,
            int messageCount,
            boolean jsonResponse) {
        long started = System.nanoTime();
        log.info("[AIChat] event=provider_started requestId={} operation={} model={} messageCount={} timeoutMs={}",
                requestId(), operation, model, messageCount, Math.max(100, timeoutMs));
        try {
            ProviderResponse response = "openrouter".equalsIgnoreCase(properties.getProvider())
                    ? callOpenRouter(model, timeoutMs, systemInstruction, prompt, jsonResponse)
                    : callGemini(model, timeoutMs, systemInstruction, prompt, jsonResponse);
            long durationMs = elapsedMs(started);
            log.info("[AIChat] event=provider_completed requestId={} operation={} model={} status={} messageCount={} durationMs={}",
                    requestId(), operation, model, response.status(), messageCount, durationMs);
            return new Completion(response.text(), model, response.status(), durationMs);
        } catch (AiChatProviderException failure) {
            log.warn("[AIChat] event=provider_failed requestId={} operation={} model={} status={} messageCount={} durationMs={} reason={}",
                    requestId(), operation, model, statusFor(failure), messageCount,
                    elapsedMs(started), failure.getKind());
            throw failure;
        }
    }

    private ProviderResponse callGemini(
            String model,
            int timeoutMs,
            String systemInstruction,
            String prompt,
            boolean jsonResponse) {
        String url = String.format(
                "%s/%s:generateContent",
                properties.getApiUrl().replaceAll("/$", ""),
                model);
        Map<String, Object> generationConfig = jsonResponse
                ? Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 4096,
                        "responseMimeType", "application/json")
                : Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 4096);
        Map<String, Object> requestBody = Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", generationConfig);
        HttpRequest request = request(url, timeoutMs)
                .header("x-goog-api-key", properties.getApiKey())
                .POST(body(requestBody))
                .build();
        HttpResponse<String> response = send(request);
        ensureSuccessful(response.statusCode());
        try {
            JsonNode textNode = objectMapper.readTree(response.body())
                    .path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (!textNode.isTextual() || textNode.asText().isBlank()) {
                throw invalidResponse("Gemini returned an empty response");
            }
            return new ProviderResponse(response.statusCode(), stripJsonCodeFence(textNode.asText()));
        } catch (AiChatProviderException failure) {
            throw failure;
        } catch (Exception failure) {
            throw new AiChatProviderException(
                    INVALID_RESPONSE, "Gemini returned an unreadable response", false, failure);
        }
    }

    private ProviderResponse callOpenRouter(
            String model,
            int timeoutMs,
            String systemInstruction,
            String prompt,
            boolean jsonResponse) {
        Map<String, Object> requestBody = jsonResponse
                ? Map.of(
                        "model", model,
                        "messages", messages(systemInstruction, prompt),
                        "temperature", 0.2,
                        "max_tokens", 2000,
                        "response_format", Map.of("type", "json_object"))
                : Map.of(
                        "model", model,
                        "messages", messages(systemInstruction, prompt),
                        "temperature", 0.2,
                        "max_tokens", 2000);
        HttpRequest request = request(properties.getApiUrl(), timeoutMs)
                .header("Accept", "application/json")
                .header("Accept-Encoding", "identity")
                .header("Authorization", "Bearer " + properties.getApiKey())
                .header("HTTP-Referer", "http://localhost:8080")
                .header("X-Title", "RentNest")
                .POST(body(requestBody))
                .build();
        HttpResponse<String> response = send(request);
        ensureSuccessful(response.statusCode());
        try {
            JsonNode textNode = objectMapper.readTree(response.body())
                    .path("choices").path(0).path("message").path("content");
            if (!textNode.isTextual() || textNode.asText().isBlank()) {
                throw invalidResponse("OpenRouter returned an empty response");
            }
            return new ProviderResponse(response.statusCode(), stripJsonCodeFence(textNode.asText()));
        } catch (AiChatProviderException failure) {
            throw failure;
        } catch (Exception failure) {
            throw new AiChatProviderException(
                    INVALID_RESPONSE, "OpenRouter returned an unreadable response", false, failure);
        }
    }

    private HttpRequest.Builder request(String url, int timeoutMs) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(Math.max(100, timeoutMs)))
                .header("Content-Type", "application/json");
    }

    private HttpRequest.BodyPublisher body(Map<String, Object> requestBody) {
        try {
            return HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody));
        } catch (Exception failure) {
            throw new AiChatProviderException(
                    INVALID_RESPONSE, "Unable to prepare the AI request", false, failure);
        }
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException failure) {
            throw new AiChatProviderException(TIMEOUT, "AI provider timed out", true, failure);
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AiChatProviderException(UNAVAILABLE, "AI provider request was interrupted", false, failure);
        } catch (IOException failure) {
            throw new AiChatProviderException(UNAVAILABLE, "AI provider is unreachable", true, failure);
        }
    }

    private void ensureSuccessful(int status) {
        if (status >= 200 && status < 300) return;
        if (status == 429) {
            throw new AiChatProviderException(RATE_LIMIT, "AI provider rate limit reached", true);
        }
        if (status >= 500) {
            throw new AiChatProviderException(UNAVAILABLE, "AI provider is unavailable", true);
        }
        throw new AiChatProviderException(UNAVAILABLE, "AI provider rejected the request", false);
    }

    private void pauseBeforeFallback() {
        try {
            Thread.sleep(Math.max(0, properties.getRetryBackoffMs()));
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AiChatProviderException(UNAVAILABLE, "AI fallback was interrupted", false, failure);
        }
    }

    private boolean hasFallbackModel() {
        String fallback = properties.getFallbackModel();
        return fallback != null && !fallback.isBlank() && !fallback.equals(properties.getModel());
    }

    private AiChatProviderException invalidResponse(String message) {
        return new AiChatProviderException(INVALID_RESPONSE, message, false);
    }

    private List<Map<String, String>> messages(String systemInstruction, String prompt) {
        return List.of(
                Map.of("role", "system", "content", systemInstruction),
                Map.of("role", "user", "content", prompt));
    }

    private String requestId() {
        String value = MDC.get("aiChatRequestId");
        return value == null ? "unavailable" : value;
    }

    private static String statusFor(AiChatProviderException failure) {
        return switch (failure.getKind()) {
            case TIMEOUT -> "timeout";
            case RATE_LIMIT -> "429";
            default -> "unavailable";
        };
    }

    private static long elapsedMs(long started) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }

    private static String stripJsonCodeFence(String text) {
        return text.trim()
                .replaceFirst("(?is)^```(?:json)?\\s*", "")
                .replaceFirst("(?is)\\s*```$", "")
                .trim();
    }

    public record Completion(String text, String model, int status, long durationMs) {}
    private record ProviderResponse(int status, String text) {}
}
