package RentNest.RentNest;
import RentNest.controller.ReviewsController;
import RentNest.dto.ReviewsDTO;
import RentNest.model.Reviews;
import RentNest.service.ReviewsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ReviewsControllerTest {

    @Mock
    private ReviewsService reviewsService;

    @InjectMocks
    private ReviewsController reviewsController;

    private MockMvc mockMvc;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(reviewsController).build();
    }

    // Test for creating a review
    @Test
    public void testCreateReview() {
        ReviewsDTO reviewsDTO = new ReviewsDTO();
        Reviews review = new Reviews();
        when(reviewsService.createReview(any(ReviewsDTO.class))).thenReturn(review);

        ResponseEntity<Reviews> response = reviewsController.createReview(reviewsDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(reviewsService, times(1)).createReview(any(ReviewsDTO.class));
    }

    // Test for getting a review by ID
    @Test
    public void testGetReviewById() {
        Long reviewId = 1L;
        Reviews review = new Reviews();
        when(reviewsService.getReviewById(reviewId)).thenReturn(Optional.of(review));

        ResponseEntity<Reviews> response = reviewsController.getReviewById(reviewId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(reviewsService, times(1)).getReviewById(reviewId);
    }

    @Test
    public void testGetReviewById_NotFound() {
        Long reviewId = 1L;
        when(reviewsService.getReviewById(reviewId)).thenReturn(Optional.empty());

        ResponseEntity<Reviews> response = reviewsController.getReviewById(reviewId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(reviewsService, times(1)).getReviewById(reviewId);
    }

    // Test for getting all reviews
    @Test
    public void testGetAllReviews() {
        Reviews review1 = new Reviews();
        Reviews review2 = new Reviews();
        List<Reviews> reviewsList = Arrays.asList(review1, review2);
        when(reviewsService.getAllReviews()).thenReturn(reviewsList);

        List<Reviews> response = reviewsController.getAllReviews();

        assertEquals(2, response.size());
        verify(reviewsService, times(1)).getAllReviews();
    }

    // Test for updating a review
    @Test
    public void testUpdateReview() {
        Long reviewId = 1L;
        ReviewsDTO reviewsDTO = new ReviewsDTO();
        Reviews updatedReview = new Reviews();
        when(reviewsService.updateReview(anyLong(), any(ReviewsDTO.class))).thenReturn(updatedReview);

        ResponseEntity<Reviews> response = reviewsController.updateReview(reviewId, reviewsDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(reviewsService, times(1)).updateReview(anyLong(), any(ReviewsDTO.class));
    }

    // Test for deleting a review
    @Test
    public void testDeleteReview() {
        Long reviewId = 1L;

        ResponseEntity<Void> response = reviewsController.deleteReview(reviewId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(reviewsService, times(1)).deleteReview(reviewId);
    }

    // Test for getting flagged reviews
    @Test
    public void testGetFlaggedReviews() {
        ReviewsDTO flaggedReview1 = new ReviewsDTO();
        flaggedReview1.setFlagged(true);
        ReviewsDTO flaggedReview2 = new ReviewsDTO();
        flaggedReview2.setFlagged(true);
        List<ReviewsDTO> flaggedReviews = Arrays.asList(flaggedReview1, flaggedReview2);
        when(reviewsService.getFlaggedReviews()).thenReturn(flaggedReviews);

        ResponseEntity<List<ReviewsDTO>> response = reviewsController.getFlaggedReviews();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
        verify(reviewsService, times(1)).getFlaggedReviews();
    }

    // Test for updating the flagged status of a review
    @Test
    public void testUpdateReviewFlagged() {
        Long reviewID = 1L;
        boolean flagValue = true;
        ReviewsDTO updatedReview = new ReviewsDTO();
        updatedReview.setFlagged(flagValue);
        when(reviewsService.updateReviewFlagged(reviewID, flagValue)).thenReturn(Optional.of(updatedReview));

        ResponseEntity<ReviewsDTO> response = reviewsController.updateReviewFlagged(reviewID, flagValue);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(flagValue, response.getBody().isFlagged());
        verify(reviewsService, times(1)).updateReviewFlagged(reviewID, flagValue);
    }
}