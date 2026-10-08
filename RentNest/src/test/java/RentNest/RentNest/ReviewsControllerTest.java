package RentNest.RentNest;
import RentNest.controller.ReviewsController;
import RentNest.dto.ReviewsDTO;
import RentNest.model.Reviews;
import RentNest.model.User;
import RentNest.service.ReviewsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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
    public void testCreateReview() throws Exception {
        ReviewsDTO reviewsDTO = new ReviewsDTO();
        ReviewsDTO createdReview = new ReviewsDTO();
        createdReview.setReviewID(1L);

        User mockUser = createUserWithId(2L);
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(mockUser);

        when(reviewsService.createReview(any(ReviewsDTO.class), anyLong())).thenReturn(createdReview);

        ResponseEntity<?> response = reviewsController.createReview(reviewsDTO, mockAuth);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(reviewsService, times(1)).createReview(any(ReviewsDTO.class), anyLong());
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

    private User createUserWithId(Long id) throws Exception {
        User user = new User();
        java.lang.reflect.Field field = User.class.getDeclaredField("userID");
        field.setAccessible(true);
        field.set(user, id);
        return user;
    }

    // Test for updating a review
    @Test
    public void testUpdateReview() throws Exception {
        Long reviewId = 1L;
        ReviewsDTO reviewsDTO = new ReviewsDTO();
        Reviews updatedReview = new Reviews();

        User mockUser = createUserWithId(2L);
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(mockUser);

        when(reviewsService.updateReview(anyLong(), any(ReviewsDTO.class), anyLong())).thenReturn(updatedReview);

        ResponseEntity<?> response = reviewsController.updateReview(reviewId, reviewsDTO, mockAuth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(reviewsService, times(1)).updateReview(anyLong(), any(ReviewsDTO.class), anyLong());
    }

    // Test for deleting a review
    @Test
    public void testDeleteReview() throws Exception {
        Long reviewId = 1L;

        User mockUser = createUserWithId(2L);
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(mockUser);

        doNothing().when(reviewsService).deleteReview(anyLong(), anyLong());

        ResponseEntity<?> response = reviewsController.deleteReview(reviewId, mockAuth);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(reviewsService, times(1)).deleteReview(anyLong(), anyLong());
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
