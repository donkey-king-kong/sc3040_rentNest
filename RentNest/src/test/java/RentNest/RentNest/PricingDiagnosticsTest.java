package RentNest.RentNest;

import RentNest.controller.FairPricingController;
import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceExplanation;
import RentNest.service.FairPriceExplanationService;
import RentNest.service.FairPricingService;
import RentNest.service.GeminiClient;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@ExtendWith(OutputCaptureExtension.class)
class PricingDiagnosticsTest {
    private static final String KEY = "secret-api-key-not-for-logs";
    private static final String PROMPT = "private listing description not for logs";
    private GeminiClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        client = new GeminiClient(KEY, "test-model");
        server = MockRestServiceServer.bindTo(
                (RestTemplate) ReflectionTestUtils.getField(client, "restTemplate")).build();
    }

    private GeminiClient.Reply generate() {
        return client.generate(GeminiClient.Operation.PRICE_EXPLANATION, PROMPT, PROMPT, 128, null);
    }

    @Test
    void logsSuccessfulResponseWithoutText(CapturedOutput output) {
        server.expect(anything()).andRespond(withSuccess(
                "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"private generated explanation\"}]}}]}",
                MediaType.APPLICATION_JSON));
        assertTrue(generate().ok());
        assertTrue(output.getOut().contains("operation=PRICE_EXPLANATION model=test-model httpStatus=200 available=true"));
        assertTrue(output.getOut().contains("durationMs="));
        assertFalse(output.getAll().contains("private generated explanation"));
        assertFalse(output.getAll().contains(KEY));
        assertFalse(output.getAll().contains(PROMPT));
        server.verify();
    }

    @Test
    void logs503ReasonWithoutEchoedSecretsAndDoesNotRetry(CapturedOutput output) {
        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\",\"message\":\"High demand: "
                        + KEY + " " + PROMPT + "\",\"details\":{\"authorization\":\"Bearer private-token\"}}}"));
        assertEquals("The AI service returned an error (HTTP 503).", generate().error());
        assertTrue(output.getOut().contains("httpStatus=503"));
        assertTrue(output.getOut().contains("providerCode=503 providerStatus=UNAVAILABLE providerReason=high_demand"));
        assertFalse(output.getAll().contains(KEY));
        assertFalse(output.getAll().contains(PROMPT));
        assertFalse(output.getAll().contains("private-token"));
        server.verify();
    }

    @Test
    void logsTimeoutTypeWithoutExceptionMessage(CapturedOutput output) {
        server.expect(anything()).andRespond(withException(new SocketTimeoutException(KEY + " " + PROMPT)));
        assertEquals("Could not reach the AI service.", generate().error());
        assertTrue(output.getOut().contains("httpStatus=none"));
        assertTrue(output.getOut().contains("errorType=SocketTimeoutException"));
        assertFalse(output.getAll().contains(KEY));
        assertFalse(output.getAll().contains(PROMPT));
        server.verify();
    }

    @Test
    void warnsOnUnreadableSuccessfulBody(CapturedOutput output) {
        server.expect(anything()).andRespond(withSuccess(PROMPT, MediaType.APPLICATION_JSON));
        assertEquals("The AI service returned an unreadable response.", generate().error());
        assertTrue(output.getOut().contains("httpStatus=200 available=false"));
        assertFalse(output.getAll().contains(PROMPT));
        server.verify();
    }

    @Test
    void omitsMalformedProviderBody(CapturedOutput output) {
        server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_GATEWAY).body(KEY + PROMPT));
        assertFalse(generate().ok());
        assertTrue(output.getOut().contains("providerDetails=unreadable"));
        assertFalse(output.getAll().contains(KEY));
        assertFalse(output.getAll().contains(PROMPT));
        server.verify();
    }

    @Test
    void doesNotLogArbitraryProviderFields(CapturedOutput output) {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                .body("{\"error\":{\"code\":\"" + KEY + "\",\"status\":\"" + KEY + "\",\"message\":\"quota exceeded\"}}"));
        assertEquals("The AI service is busy. Please try again in a minute.", generate().error());
        assertTrue(output.getOut().contains("providerCode=unknown providerStatus=UNKNOWN providerReason=quota_or_rate_limit"));
        assertFalse(output.getAll().contains(KEY));
        server.verify();
    }

    @Test
    void warnsOnUnavailableHttp200AndRestoresDiagnosticContext(CapturedOutput output) {
        FairPricingService prices = mock(FairPricingService.class);
        FairPriceExplanationService explanations = mock(FairPriceExplanationService.class);
        var unavailable = FairPriceExplanation.unavailable("The AI service returned an error (HTTP 503).");
        when(explanations.explainListing(41L)).thenAnswer(invocation -> {
            assertEquals("41", MDC.get("pricingListingId"));
            assertNotNull(MDC.get("pricingRequestId"));
            return Optional.of(unavailable);
        });
        MDC.put("pricingRequestId", "outer-request");
        try {
            var response = new FairPricingController(prices, explanations).getExplanationForListing(41L);
            assertEquals(200, response.getStatusCode().value());
            assertSame(unavailable, response.getBody());
            assertEquals("outer-request", MDC.get("pricingRequestId"));
            assertNull(MDC.get("pricingListingId"));
            assertTrue(output.getOut().contains("operation=explanation httpStatus=200 available=false"));
        } finally {
            MDC.clear();
        }
    }

    @Test
    void logsUnexpectedFailureWithoutSwallowingIt(CapturedOutput output) {
        FairPricingService prices = mock(FairPricingService.class);
        RuntimeException failure = new IllegalStateException(KEY);
        when(prices.estimateForListing(41L)).thenThrow(failure);
        var controller = new FairPricingController(prices, mock(FairPriceExplanationService.class));
        assertSame(failure, assertThrows(IllegalStateException.class, () -> controller.getEstimateForListing(41L)));
        assertNull(MDC.get("pricingRequestId"));
        assertTrue(output.getAll().contains("event=request_failed"));
        assertTrue(output.getAll().contains("errorType=IllegalStateException"));
        assertFalse(output.getAll().contains(KEY));
    }

    @Test
    void logsCacheMissAndHitButDoesNotCacheFailure(CapturedOutput output) {
        var prices = mock(FairPricingService.class);
        var listings = mock(ListingsService.class);
        var gemini = mock(GeminiClient.class);
        Listings listing = new Listings();
        listing.setListingID(41L);
        listing.setDescription(PROMPT);
        FairPriceEstimate estimate = new FairPriceEstimate();
        estimate.setAvailable(true);
        estimate.setAskingPrice(3800);
        estimate.setFairPrice(4240);
        estimate.setTiers(List.of());
        when(listings.getListingById(41L)).thenReturn(Optional.of(listing));
        when(prices.estimateForListing(listing)).thenReturn(estimate);
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.getModel()).thenReturn("test-model");
        when(gemini.generate(eq(GeminiClient.Operation.PRICE_EXPLANATION), anyString(), anyString(), anyInt(), isNull()))
                .thenReturn(new GeminiClient.Reply(null, "upstream unavailable"),
                        new GeminiClient.Reply("private generated explanation", null));
        var service = new FairPriceExplanationService(prices, listings, gemini);
        assertFalse(service.explainListing(41L).orElseThrow().isAvailable());
        assertTrue(service.explainListing(41L).orElseThrow().isAvailable());
        assertTrue(service.explainListing(41L).orElseThrow().isAvailable());
        verify(gemini, times(2)).generate(eq(GeminiClient.Operation.PRICE_EXPLANATION), anyString(), anyString(), anyInt(), isNull());
        assertTrue(output.getOut().contains("listingId=41 cache=miss"));
        assertTrue(output.getOut().contains("listingId=41 cache=hit"));
        assertFalse(output.getAll().contains(PROMPT));
    }
}
