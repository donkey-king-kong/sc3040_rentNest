package RentNest.controller;

import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceExplanation;
import RentNest.service.FairPriceExplanationService;
import RentNest.service.FairPricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    private final FairPricingService fairPricingService;
    private final FairPriceExplanationService fairPriceExplanationService;

    @Autowired
    public FairPricingController(FairPricingService fairPricingService, FairPriceExplanationService fairPriceExplanationService) {
        this.fairPricingService = fairPricingService;
        this.fairPriceExplanationService = fairPriceExplanationService;
    }

    @GetMapping("/listing/{listingId}")
    public ResponseEntity<FairPriceEstimate> getEstimateForListing(@PathVariable Long listingId) {
        return fairPricingService.estimateForListing(listingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/listing/{listingId}/explanation")
    public ResponseEntity<FairPriceExplanation> getExplanationForListing(@PathVariable Long listingId) {
        return fairPriceExplanationService.explainListing(listingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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
