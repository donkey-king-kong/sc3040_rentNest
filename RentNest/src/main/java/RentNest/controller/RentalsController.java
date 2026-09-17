package RentNest.controller;

import RentNest.dto.ChatHistoryDTO;
import RentNest.model.Rentals;
import RentNest.dto.RentalsDTO;
import RentNest.service.RentalsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rentals")
public class RentalsController {

    private final RentalsService rentalsService;
    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    public RentalsController(RentalsService rentalsService) {
        this.rentalsService = rentalsService;
    }

    // Create a new rental
    @PostMapping
    public ResponseEntity<?> createRental(@RequestBody RentalsDTO rentalDTO) {
        try {
            Rentals createdRental = rentalsService.createRental(rentalDTO);
            return new ResponseEntity<>(createdRental, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>("Error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
//    Example:
//    {
//        "tenantUserID": 12345, // Replace with a valid tenant user ID
//            "rentalPrice": 2000, // Example rental price
//            "depositPrice": 3000, // Example deposit price
//            "rentalDate": "2024-09-30", // Example rental date in yyyy-MM-dd format
//            "paymentHistory": "First payment made on 2024-09-30", // Example payment history
//            "status": "active" // Example status
//    }

    // Read all rentals
    @GetMapping
    public ResponseEntity<List<Rentals>> getAllRentals() {
        List<Rentals> rentals = rentalsService.getAllRentals();
        return new ResponseEntity<>(rentals, HttpStatus.OK);
    }

    // Read a rental by ID
    @GetMapping("/{rentalID}")
    public ResponseEntity<Rentals> getRentalById(@PathVariable Long rentalID) {
        Optional<Rentals> rental = rentalsService.getRentalById(rentalID);
        return rental.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Get rental by listing ID
    @GetMapping("/listing/{listingID}")
    public ResponseEntity<?> getRentalByListingId(@PathVariable Long listingID) {
        try {
            Optional<Rentals> rental = rentalsService.getRentalByListingId(listingID);
            if (rental.isPresent()) {
                return ResponseEntity.ok(rental.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("No rental found for listing ID: " + listingID);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid listing ID: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error occurred: " + e.getMessage());
        }
    }

    // Update a rental
    @PutMapping("/{rentalID}")
    public ResponseEntity<Rentals> updateRental(@PathVariable Long rentalID, @RequestBody RentalsDTO updatedRentalDTO) {
        Rentals rental = rentalsService.updateRental(rentalID, updatedRentalDTO);
        return rental != null ? ResponseEntity.ok(rental) : ResponseEntity.notFound().build();
    }

    // Delete a rental
    @DeleteMapping("/{rentalID}")
    public ResponseEntity<Void> deleteRental(@PathVariable Long rentalID) {
        rentalsService.deleteRental(rentalID);
        return ResponseEntity.noContent().build();
    }

    // Format: POST /api/rentals/createRentalOffer?senderID=5&receiverID=3
    @PostMapping("/createRentalOffer")
    public ResponseEntity<?> createRentalOffer(
            @RequestBody Map<String, Object> requestBody,
            @RequestParam Long senderID,
            @RequestParam Long receiverID) {
        try {
            // Extract RentalsDTO and ChatHistoryDTO from requestBody
            RentalsDTO rentalDTO = objectMapper.convertValue(requestBody.get("rentalDTO"), RentalsDTO.class);
            ChatHistoryDTO chatHistoryDTO = objectMapper.convertValue(requestBody.get("chatHistoryDTO"), ChatHistoryDTO.class);

            // Call the service method to create a rental offer and chat history entry
            Rentals createdRental = rentalsService.createRentalOffer(rentalDTO, chatHistoryDTO, senderID, receiverID);
            return new ResponseEntity<>(createdRental, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>("Error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }



    /*
        {
            "rentalDTO": {
                "listingID": 5,
                "tenantUserID": 3,
                "rentalPrice": 2000,
                "depositPrice": 3000,
                "rentalDate": "2024-09-30",
                "leaseExpiry": "2026-09-30",
                "paymentHistory": "First payment made on 2024-09-30",
                "status": "pending"
            },
            "chatHistoryDTO": {
                "receiverID": 3,
                "message": "Rental offer made.",
                "date": "2024-09-30T12:00:00Z"
            }
        }
     */


    @PutMapping("/reviewRentalOffer/{rentalID}")
    public ResponseEntity<?> reviewRentalOffer(
            @PathVariable Long rentalID, @RequestBody RentalsDTO updatedRentalDTO) {
        try {
            Rentals reviewedRental = rentalsService.reviewRentalOffer(rentalID, updatedRentalDTO);
            return new ResponseEntity<>(reviewedRental, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return new ResponseEntity<>("Error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/owner/{listingID}")
    public ResponseEntity<?> manageTenants(@PathVariable Long listingID) {
        try {
            // Fetch the tenant IDs for the given ownerID
            List<Long> tenantIDs = rentalsService.manageTenants(listingID);

            // If the list is empty, return 204 NO CONTENT
            if (tenantIDs.isEmpty()) {
                return new ResponseEntity<>("No tenants found for the specified listing.", HttpStatus.NO_CONTENT);
            }

            // Return the tenant IDs as the response
            return ResponseEntity.ok(tenantIDs);

        } catch (IllegalArgumentException e) {
            // Return a 400 BAD REQUEST status for invalid input arguments
            return new ResponseEntity<>("Invalid listingID - " + e.getMessage(), HttpStatus.BAD_REQUEST);

        } catch (DataAccessException e) {
            // Handle database-related errors (e.g., connection issues, query failures)
            return new ResponseEntity<>("Database error: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);

        } catch (NullPointerException e) {
            // Handle cases where null values cause issues (e.g., when entities are unexpectedly null)
            return new ResponseEntity<>("Unexpected null value encountered: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);

        } catch (Exception e) {
            // Catch any other unhandled exceptions and return a generic internal server error
            return new ResponseEntity<>("An unexpected error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
