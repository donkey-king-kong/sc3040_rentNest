package RentNest.controller;

import RentNest.model.Requests;
import RentNest.dto.RequestsDTO;
import RentNest.service.RequestsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class RequestsController {

    private final RequestsService requestsService;

    public RequestsController(RequestsService requestsService) {
        this.requestsService = requestsService;
    }

    // Create a new request
    @PostMapping
    public ResponseEntity<Requests> createRequest(@RequestBody RequestsDTO requestsDTO) {
        Requests createdRequest = requestsService.createRequest(requestsDTO);
        return new ResponseEntity<>(createdRequest, HttpStatus.CREATED);
    }

    // Get all requests
    @GetMapping
    public ResponseEntity<List<Requests>> getAllRequests() {
        List<Requests> requests = requestsService.getAllRequests();
        return new ResponseEntity<>(requests, HttpStatus.OK);
    }

    // Get a request by ID
    @GetMapping("/{id}")
    public ResponseEntity<Requests> getRequestById(@PathVariable("id") Long requestID) {
        Requests request = requestsService.getRequestById(requestID)
                .orElseThrow(() -> new RuntimeException("Request not found with ID: " + requestID));
        return new ResponseEntity<>(request, HttpStatus.OK);
    }

    // Update a request
    @PutMapping("/{id}")
    public ResponseEntity<Requests> updateRequest(@PathVariable("id") Long requestID, @RequestBody RequestsDTO requestsDTO) {
        Requests updatedRequest = requestsService.updateRequest(requestID, requestsDTO);
        return new ResponseEntity<>(updatedRequest, HttpStatus.OK);
    }

    // Delete a request
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequest(@PathVariable("id") Long requestID) {
        requestsService.deleteRequest(requestID);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/terminationrequest/{rentalid}/{refundAmount}")
    public ResponseEntity<String> makeTerminationRequest(@PathVariable("rentalid") Long requestID,@PathVariable("refundAmount") long refundAmount) {
        try {
            requestsService.makeTerminationRequest(requestID,refundAmount);
            return new ResponseEntity<>("Request and Chat History created successfully", HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
