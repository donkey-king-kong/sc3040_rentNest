package RentNest.controller;

import RentNest.model.Payment;
import RentNest.dto.PaymentDTO;
import RentNest.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {
    private final PaymentService paymentService;

    @Autowired
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    //CRUD
    //Create
    @PostMapping
    public ResponseEntity<Payment> payment(@RequestBody PaymentDTO paymentDTO) {
        Payment createdPayment = paymentService.createPayment(paymentDTO);
        return new ResponseEntity<>(createdPayment, HttpStatus.CREATED);
    }
    //Read by ID
    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPaymentByID(@PathVariable Long id) {
        Optional<Payment> payment = paymentService.getPaymentID(id);
        return payment.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    //Read all payments
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayment();
    }
    //Update payment
    @PutMapping("/{id}")
    public ResponseEntity<Payment> updatePayment(@PathVariable Long id, @RequestBody PaymentDTO paymentDTO) {
        Payment updatedPayment = paymentService.updatePayment(id, paymentDTO);
        return ResponseEntity.ok(updatedPayment);
    }
    //Delete payment
    @DeleteMapping("/{id}")
    public ResponseEntity<Payment> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }

    // Make Monthly Payment
    @PostMapping("/monthlyPayment")
    public ResponseEntity<String> makeMonthlyPayment(@RequestBody PaymentDTO paymentDTO) {
        boolean isSuccess = paymentService.makeMonthlyPayment(paymentDTO);
        if (isSuccess) {
            return new ResponseEntity<>("Monthly payment made.", HttpStatus.OK);
        } else {
            return new ResponseEntity<>("Failed to make monthly payment. Ensure rentalID exists and amount is correct.", HttpStatus.BAD_REQUEST);
        }
    }

    // Get all payments by a rental ID
    @GetMapping("/paymentsList/{rentalID}")
    public ResponseEntity<?> getAllPaymentsByRentalID(@PathVariable Long rentalID) {
        try {
            List<PaymentDTO> payments = paymentService.getAllPaymentsByRentalID(rentalID);
            return new ResponseEntity<>(payments, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            // Return an error message
            return new ResponseEntity<>("No payments found for the provided rental ID: " + rentalID, HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            // Handle unexpected errors
            return new ResponseEntity<>("An unexpected error occurred while fetching payments.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/outstandingPayments/{rentalID}")
    public ResponseEntity<String> getAllOutstandingPaymentsByRentalID(@PathVariable Long rentalID) {
        try {
            // Get the response from the service
            String jsonResponse = paymentService.getAllOutstandingPaymentsByRentalID(rentalID);

            // Check if the response is empty, meaning no outstanding payments
            if (jsonResponse == null || jsonResponse.contains("\"Outstanding Months\": []")) {
                // No outstanding payments, return 204 No Content with a message
                return ResponseEntity.status(HttpStatus.NO_CONTENT)
                        .header("Content-Type", "application/json")
                        .body("No outstanding payments for rental ID: " + rentalID);
            }

            // Return the JSON response if everything is OK
            return ResponseEntity.status(HttpStatus.OK)
                    .header("Content-Type", "application/json")
                    .body(jsonResponse);
        } catch (IllegalArgumentException e) {
            // Return 404 Not Found if rental ID is invalid
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Rental ID: " + rentalID + " not found.");
        } catch (Exception e) {
            // Return 500 Internal Server Error for any unexpected issues
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"message\": \"An internal error occurred while processing the request.\"}");
        }
    }

    @GetMapping("/tenant-payments/{listingID}/{tenantID}")
    public ResponseEntity<?> selectTenant(@PathVariable Long listingID, @PathVariable Long tenantID) {
        try {
            // Attempt to retrieve the rental price and the list of payments
            Map<String, Object> rentalInfo = paymentService.selectTenant(listingID, tenantID);
            return new ResponseEntity<>(rentalInfo, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            // Handle cases where the listing or rental could not be found
            return new ResponseEntity<>("Error: " + e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (RuntimeException e) {
            // Handle unexpected errors
            return new ResponseEntity<>("An unexpected error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }



}
