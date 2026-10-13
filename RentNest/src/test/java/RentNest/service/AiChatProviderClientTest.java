package RentNest.service;

import RentNest.config.AiChatProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiChatProviderClientTest {
    private AiChatProperties properties;
    private HttpClient httpClient;
    private AiChatProviderClient client;

    @BeforeEach
    void setUp() {
        properties = new AiChatProperties();
        properties.setApiKey("test-key");
        properties.setApiUrl("https://ai.test/models");
        properties.setModel("gemini-primary");
        properties.setFallbackModel("gemini-fallback");
        properties.setPrimaryTimeoutMs(25_000);
        properties.setFallbackTimeoutMs(10_000);
        properties.setRetryBackoffMs(0);
        httpClient = mock(HttpClient.class);
        client = new AiChatProviderClient(properties, httpClient, new ObjectMapper());
    }

    @Test
    void timeoutFallsBackOnceWithItsOwnBoundedTimeout() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("primary timeout"))
                .thenReturn(response(200, geminiBody(validSummary())));

        AiChatProviderClient.Completion result =
                client.complete("system", "prompt", "summary", 11, true);

        assertEquals("gemini-fallback", result.model());
        assertEquals(validSummary(), result.text());
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient, times(2)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        assertEquals("/models/gemini-primary:generateContent", requests.getAllValues().get(0).uri().getPath());
        assertEquals(Duration.ofSeconds(25), requests.getAllValues().get(0).timeout().orElseThrow());
        assertEquals("/models/gemini-fallback:generateContent", requests.getAllValues().get(1).uri().getPath());
        assertEquals(Duration.ofSeconds(10), requests.getAllValues().get(1).timeout().orElseThrow());
    }

    @Test
    void rateLimitUsesFallbackButRejectedRequestDoesNotRetry() throws Exception {
        HttpResponse<String> rateLimited = response(429, "{}");
        HttpResponse<String> fallbackSuccess = response(200, geminiBody(validSummary()));
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(rateLimited)
                .thenReturn(fallbackSuccess);
        assertEquals("gemini-fallback",
                client.complete("system", "prompt", "summary", 2, true).model());

        httpClient = mock(HttpClient.class);
        client = new AiChatProviderClient(properties, httpClient, new ObjectMapper());
        HttpResponse<String> rejected = response(400, "{}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(rejected);

        AiChatProviderException failure = assertThrows(
                AiChatProviderException.class,
                () -> client.complete("system", "prompt", "summary", 2, true));
        assertEquals(AiChatProviderException.Kind.UNAVAILABLE, failure.getKind());
        verify(httpClient, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<String> response(int status, String body) {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        return response;
    }

    private String geminiBody(String text) throws Exception {
        return new ObjectMapper().writeValueAsString(java.util.Map.of(
                "candidates", java.util.List.of(java.util.Map.of(
                        "content", java.util.Map.of(
                                "parts", java.util.List.of(java.util.Map.of("text", text)))))));
    }

    private String validSummary() {
        return "{\"overview\":\"Overview\",\"next_steps\":\"Next\",\"sections\":[]}";
    }
}
