package RentNest.controller;

import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceExplanation;
import RentNest.service.FairPriceExplanationService;
import RentNest.service.FairPricingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * AI Fair-Pricing Model endpoints.
 *
 *  GET /api/pricing/listing/{listingId}
 *      Tenant view: fair range for an existing listing plus a verdict on its asking price.
 *
 *  GET /api/pricing/listing/{listingId}/explanation
 *      Tenant view: Gemini's plain-English explanation of the verdict, using the listing description.
 *      Separate from the estimate so the price bands render without waiting for the LLM.
 *
 *  GET /api/pricing/estimate?type=HDB&postal=520201&beds=3&size=950&floor=8&price=3600
 *      Owner view: fair range for a property described by its attributes, for use while
 *      creating or editing a listing. "price" is optional; when supplied a verdict is returned.
 */
@RestController
@RequestMapping("/api/pricing")
public class FairPricingController {
    private static final Logger log = LoggerFactory.getLogger(FairPricingController.class);

    private final FairPricingService fairPricingService;
    private final FairPriceExplanationService fairPriceExplanationService;

    @Autowired
    public FairPricingController(FairPricingService fairPricingService, FairPriceExplanationService fairPriceExplanationService) {
        this.fairPricingService = fairPricingService;
        this.fairPriceExplanationService = fairPriceExplanationService;
    }

    @GetMapping("/listing/{listingId}")
    public ResponseEntity<FairPriceEstimate> getEstimateForListing(@PathVariable Long listingId) {
        return loggedListingRequest(listingId, "estimate",
                () -> fairPricingService.estimateForListing(listingId), FairPriceEstimate::isAvailable);
    }

    @GetMapping("/listing/{listingId}/explanation")
    public ResponseEntity<FairPriceExplanation> getExplanationForListing(@PathVariable Long listingId) {
        return loggedListingRequest(listingId, "explanation",
                () -> fairPriceExplanationService.explainListing(listingId), FairPriceExplanation::isAvailable);
    }

    private <T> ResponseEntity<T> loggedListingRequest(Long listingId, String operation,
                                                      Supplier<Optional<T>> action, Predicate<T> isAvailable) {
        Map<String, String> previousContext = MDC.getCopyOfContextMap();
        String requestId = UUID.randomUUID().toString();
        long started = System.nanoTime();
        MDC.put("pricingRequestId", requestId);
        MDC.put("pricingListingId", String.valueOf(listingId));
        try {
            log.info("[PricingAI] event=request_started requestId={} listingId={} operation={}",
                    requestId, listingId, operation);
            Optional<T> result = action.get();
            int status = result.isPresent() ? 200 : 404;
            boolean available = result.filter(isAvailable).isPresent();
            long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            if (available) {
                log.info("[PricingAI] event=request_completed requestId={} listingId={} operation={} httpStatus={} available=true durationMs={}",
                        requestId, listingId, operation, status, elapsed);
            } else {
                log.warn("[PricingAI] event=request_completed requestId={} listingId={} operation={} httpStatus={} available=false durationMs={}",
                        requestId, listingId, operation, status, elapsed);
            }
            return result.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
        } catch (RuntimeException e) {
            log.error("[PricingAI] event=request_failed requestId={} listingId={} operation={} durationMs={} errorType={}",
                    requestId, listingId, operation, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started),
                    e.getClass().getSimpleName());
            throw e;
        } finally {
            if (previousContext == null) MDC.clear();
            else MDC.setContextMap(previousContext);
        }
    }

    @GetMapping("/estimate")
    public ResponseEntity<FairPriceEstimate> getEstimate(
            @RequestParam String type,
            @RequestParam Integer postal,
            @RequestParam(required = false) Integer beds,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) Integer price) {
        return ResponseEntity.ok(fairPricingService.estimate(type, postal, beds, size, floor, price));
    }
}
