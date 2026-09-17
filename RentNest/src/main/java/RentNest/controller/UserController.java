package RentNest.controller;

import java.util.Optional;

import RentNest.dto.ListingsDTO;
import RentNest.service.ListingsService;
import RentNest.dto.ReviewsDTO;
import RentNest.repository.ReviewsRepository;
import RentNest.service.ReviewsService;
import RentNest.model.User;
import RentNest.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ReviewsRepository reviewsRepository;
    private final ReviewsService reviewsService;
    private final ListingsService listingsService;

    @Autowired
    public UserController(UserService userService, ReviewsRepository reviewsRepository, ReviewsService reviewsService, ListingsService listingsService) {
        this.userService = userService;
        this.reviewsRepository = reviewsRepository;
        this.reviewsService = reviewsService;
        this.listingsService = listingsService;
    }

    @GetMapping("/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email){
        User userByEmail = userService.getUserByEmail(email);
        return ResponseEntity.ok(userByEmail);
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<?> getUserByID(@PathVariable Long id){
        User userById = userService.getUserById(id);
        return ResponseEntity.ok(userById);
    }

    @PostMapping("/add")
    public ResponseEntity<User> addUser(@RequestBody User user) {
        User createdUser = userService.createUser(user);
        return ResponseEntity.ok(createdUser); // Return the created user
    }

    @GetMapping("/all")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    //Get Flagged Users
    @GetMapping("/admin/flagged")
    public ResponseEntity<List<User>> getFlaggedUsers() {
        List<User> flaggedUsers = userService.getFlaggedUser();
        return ResponseEntity.ok(flaggedUsers);
    }

    //Update Flag (0 = Not Flagged, 1 = Flagged, 2 = Banned)
    @PutMapping("/setFlag/{userID}/{flagValue}")
    public ResponseEntity<User> updateUserFlagged(@PathVariable Long userID, @PathVariable int flagValue) {
        Optional<User> updatedUser = userService.updateUserFlagged(userID, flagValue);

        // Return the appropriate response based on the result
        return updatedUser.isPresent() ? 
            ResponseEntity.ok(updatedUser.get()) : 
            ResponseEntity.notFound().build();
    }

    // Update user data
    @PutMapping("/id/{userID}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long userID,
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam String contact) {
        Optional<User> updatedUser = userService.updateUserData(userID, name, email, contact);
        
        return updatedUser.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Get Reviews for a User by UserId
    @GetMapping ("/{userId}/reviews")
    public ResponseEntity<List<ReviewsDTO>> getReviewsByUser(@PathVariable Long userId) {
        // Fetch the reviews for the given UserID
        List<ReviewsDTO> reviews = reviewsService.getReviewsByUser(userId);

        // Return the list of ReviewDTOs
        return ResponseEntity.ok(reviews);
    }

    // Get Listings for a User by UserID
    @GetMapping ("/{userId}/listings")
    public ResponseEntity<List<ListingsDTO>> getListingsByUser(@PathVariable Long userId) {
        // Fetch the listings for the given UserID
        List<ListingsDTO> listings = listingsService.getListingsByUserID(userId);

        // Return the list of ListingsDTOs
        return ResponseEntity.ok(listings);
    }
}
