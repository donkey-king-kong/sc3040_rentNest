package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceEstimate.Confidence;
import RentNest.model.api.FairPriceEstimate.PriceTier;
import RentNest.model.api.FairPriceEstimate.Tier;
import RentNest.model.api.FairPriceExplanation;
import RentNest.service.FairPriceExplanationService;
import RentNest.service.FairPricingService;
import RentNest.service.GeminiClient;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class FairPriceExplanationServiceTest {

    @Mock
    private FairPricingService fairPricingService;

    @Mock
    private ListingsService listingsService;

    private Listings listing;
    private FairPriceEstimate estimate;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);

        listing = new Listings();
        listing.setListingID(7L);
        listing.setName("Bright 3-room near Tampines MRT");
        listing.setType("HDB");
        listing.setPostal(520201);
        listing.setBeds(2);
        listing.setBathroom(2);
        listing.setSize(700);
        listing.setFloor(8);
        listing.setPrice(3150);
        listing.setDescription("Fully renovated in 2025, fully furnished, unblocked view.");

        estimate = new FairPriceEstimate();
        estimate.setAvailable(true);
        estimate.setFairPrice(2880);
        estimate.setTiers(List.of(
                new PriceTier(Tier.EXCELLENT, 5, 2740, 3020),
                new PriceTier(Tier.GREAT, 10, 2590, 3170),
                new PriceTier(Tier.GOOD, 15, 2450, 3310)));
        estimate.setAskingPrice(3150);
        estimate.setPercentDiffFromFair(9.4);
        estimate.setTier(Tier.GREAT);
        estimate.setConfidence(Confidence.HIGH);
        estimate.setComparableCount(702);
        estimate.setBasis("3-ROOM HDB flats along TAMPINES ST 21");
        estimate.setPeriodStart("2021-01");
        estimate.setPeriodEnd("2026-08");
        estimate.setFloorAdjustment("-0.8% for floor 8");
        estimate.setSizeAdjustment("No size adjustment applied.");
    }

    @Test
    public void testPromptContainsModelOutputListingAndDescription() {
        String prompt = FairPriceExplanationService.buildPrompt(listing, estimate);

        assertTrue(prompt.contains("Fair market rent: $2880/month"));
        assertTrue(prompt.contains("Asking rent: $3150/month"));
        assertTrue(prompt.contains("Verdict: GREAT (+9.4% vs fair rent)"));
        assertTrue(prompt.contains("702 comparable 3-ROOM HDB flats along TAMPINES ST 21"));
        assertTrue(prompt.contains("GOOD band (+/-15%): $2450 - $3310"));
        assertTrue(prompt.contains("Bedrooms: 2, bathrooms: 2"));
        assertTrue(prompt.contains("<owner_description>\nFully renovated in 2025"));
    }

    @Test
    public void testPromptSaysWhenPricedAsRoom() {
        estimate.setUnitType("MASTER_ROOM");
        estimate.setUnitTypeSource("AI");
        String prompt = FairPriceExplanationService.buildPrompt(listing, estimate);
        assertTrue(prompt.contains("Rental unit: MASTER_ROOM (a single room, not the whole flat; detected by AI)"));
    }

    @Test
    public void testPromptMarksMissingDescription() {
        listing.setDescription("   ");
        String prompt = FairPriceExplanationService.buildPrompt(listing, estimate);
        assertTrue(prompt.contains("<owner_description>\n(none provided)\n</owner_description>"));
    }

    @Test
    public void testUnavailableWithoutApiKey() {
        when(listingsService.getListingById(7L)).thenReturn(Optional.of(listing));
        FairPriceExplanationService service = new FairPriceExplanationService(fairPricingService, listingsService, new GeminiClient("", ""));

        Optional<FairPriceExplanation> result = service.explainListing(7L);

        assertTrue(result.isPresent());
        assertFalse(result.get().isAvailable());
        assertTrue(result.get().getMessage().contains("GEMINI_API_KEY"));
        verifyNoInteractions(fairPricingService);
    }

    @Test
    public void testEmptyForMissingListing() {
        when(listingsService.getListingById(99L)).thenReturn(Optional.empty());
        FairPriceExplanationService service = new FairPriceExplanationService(fairPricingService, listingsService, new GeminiClient("", ""));

        assertTrue(service.explainListing(99L).isEmpty());
    }

    @Test
    public void testParseResponseSkipsThoughtsAndJoinsText() {
        String json = """
                {"candidates":[{"content":{"role":"model","parts":[
                  {"text":"planning...","thought":true},
                  {"text":"Asking rent is 9% above the fair rent. "},
                  {"text":"Ask when the renovation was done."}]},
                  "finishReason":"STOP"}]}""";

        FairPriceExplanation e = FairPriceExplanationService.parseResponse(json, "gemini-test");

        assertTrue(e.isAvailable());
        assertEquals("Asking rent is 9% above the fair rent. Ask when the renovation was done.", e.getExplanation());
        assertEquals("gemini-test", e.getModel());
    }

    @Test
    public void testParseResponseBlocked() {
        assertFalse(FairPriceExplanationService.parseResponse(
                "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}", "m").isAvailable());
        assertFalse(FairPriceExplanationService.parseResponse(
                "{\"candidates\":[{\"finishReason\":\"SAFETY\"}]}", "m").isAvailable());
    }

    @Test
    public void testParseResponseEmptyOrMalformed() {
        assertFalse(FairPriceExplanationService.parseResponse("{\"candidates\":[]}", "m").isAvailable());
        assertFalse(FairPriceExplanationService.parseResponse("not json", "m").isAvailable());
        assertFalse(FairPriceExplanationService.parseResponse(null, "m").isAvailable());
    }
}
