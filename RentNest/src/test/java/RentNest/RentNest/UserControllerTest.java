package RentNest.RentNest;

import RentNest.controller.UserController;
import RentNest.dto.ListingsDTO;
import RentNest.dto.ReviewsDTO;
import RentNest.model.User;
import RentNest.service.ListingsService;
import RentNest.service.ReviewsService;
import RentNest.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private ReviewsService reviewsService;

    @Mock
    private ListingsService listingsService;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAddUser() {
        User user = new User();
        when(userService.createUser(user)).thenReturn(user);

        ResponseEntity<User> response = userController.addUser(user);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(user, response.getBody());
        verify(userService, times(1)).createUser(user);
    }

    @Test
    void testGetAllUsers() {
        List<User> users = new ArrayList<>();
        when(userService.getAllUsers()).thenReturn(users);

        List<User> result = userController.getAllUsers();

        assertEquals(users, result);
        verify(userService, times(1)).getAllUsers();
    }

    @Test
    void testGetFlaggedUsers() {
        List<User> flaggedUsers = new ArrayList<>();
        when(userService.getFlaggedUser()).thenReturn(flaggedUsers);

        ResponseEntity<List<User>> response = userController.getFlaggedUsers();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(flaggedUsers, response.getBody());
        verify(userService, times(1)).getFlaggedUser();
    }

    @Test
    void testUpdateUserFlagged_Success() {
        Long userId = 1L;
        int flagValue = 1;
        User user = new User();
        when(userService.updateUserFlagged(userId, flagValue)).thenReturn(Optional.of(user));

        ResponseEntity<User> response = userController.updateUserFlagged(userId, flagValue);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(user, response.getBody());
        verify(userService, times(1)).updateUserFlagged(userId, flagValue);
    }

    @Test
    void testUpdateUserFlagged_NotFound() {
        Long userId = 1L;
        int flagValue = 1;
        when(userService.updateUserFlagged(userId, flagValue)).thenReturn(Optional.empty());

        ResponseEntity<User> response = userController.updateUserFlagged(userId, flagValue);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(userService, times(1)).updateUserFlagged(userId, flagValue);
    }

    @Test
    void testGetReviewsByUser() {
        Long userId = 1L;
        List<ReviewsDTO> reviews = new ArrayList<>();
        when(reviewsService.getReviewsByUser(userId)).thenReturn(reviews);

        ResponseEntity<List<ReviewsDTO>> response = userController.getReviewsByUser(userId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(reviews, response.getBody());
        verify(reviewsService, times(1)).getReviewsByUser(userId);
    }

    @Test
    void testGetListingsByUser() {
        Long userId = 1L;
        List<ListingsDTO> listings = new ArrayList<>();
        when(listingsService.getListingsByUserID(userId)).thenReturn(listings);

        ResponseEntity<List<ListingsDTO>> response = userController.getListingsByUser(userId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(listings, response.getBody());
        verify(listingsService, times(1)).getListingsByUserID(userId);
    }
}
