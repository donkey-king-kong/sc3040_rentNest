package RentNest.RentNest;

import RentNest.controller.FairPricingController;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceExplanation;
import RentNest.service.FairPriceExplanationService;
import RentNest.service.FairPricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class FairPricingControllerTest {

    @InjectMocks
    private FairPricingController controller;

    @Mock
    private FairPricingService fairPricingService;

    @Mock
    private FairPriceExplanationService fairPriceExplanationService;

    private FairPriceEstimate estimate;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        estimate = new FairPriceEstimate();
        estimate.setAvailable(true);
        estimate.setFairPrice(3000);
    }

    @Test
    public void testGetEstimateForListingFound() {
        when(fairPricingService.estimateForListing(1L)).thenReturn(Optional.of(estimate));

        ResponseEntity<FairPriceEstimate> response = controller.getEstimateForListing(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(3000, response.getBody().getFairPrice());
        verify(fairPricingService, times(1)).estimateForListing(1L);
    }

    @Test
    public void testGetEstimateForListingNotFound() {
        when(fairPricingService.estimateForListing(42L)).thenReturn(Optional.empty());

        ResponseEntity<FairPriceEstimate> response = controller.getEstimateForListing(42L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testGetEstimateByAttributes() {
        when(fairPricingService.estimate("HDB", 550264, 3, 950, 6, 3600)).thenReturn(estimate);

        ResponseEntity<FairPriceEstimate> response = controller.getEstimate("HDB", 550264, 3, 950, 6, 3600);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(estimate, response.getBody());
        verify(fairPricingService, times(1)).estimate("HDB", 550264, 3, 950, 6, 3600);
    }

    @Test
    public void testGetExplanationForListingFound() {
        FairPriceExplanation explanation = FairPriceExplanation.of("Asking rent is 9% above fair rent.", "gemini-3.8-flash");
        when(fairPriceExplanationService.explainListing(1L)).thenReturn(Optional.of(explanation));

        ResponseEntity<FairPriceExplanation> response = controller.getExplanationForListing(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(explanation, response.getBody());
    }

    @Test
    public void testGetExplanationForListingNotFound() {
        when(fairPriceExplanationService.explainListing(42L)).thenReturn(Optional.empty());

        ResponseEntity<FairPriceExplanation> response = controller.getExplanationForListing(42L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
