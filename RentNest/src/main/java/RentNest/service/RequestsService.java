package RentNest.service;

import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RequestsDTO;
import RentNest.model.Requests;
import RentNest.repository.RequestsRepository;
import RentNest.repository.ChatHistoryRepository;
import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import RentNest.model.Rentals;
import RentNest.dto.RentalsDTO;
import RentNest.repository.RentalsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.List;

@Service
public class RequestsService {

    private final RequestsRepository requestsRepository;
    private final RentalsRepository rentalsRepository;
    private final ListingsRepository listingsRepository;
    private final ChatHistoryService chatHistoryService;
    private final ChatHistoryRepository chatHistoryRepository;

    // Mapping Requests to RequestsDTO
    public RequestsDTO toRequestsDTO(Requests requests) {
        RequestsDTO requestsDTO = new RequestsDTO();

        // Map basic fields
        requestsDTO.setStatus(requests.getStatus());
        requestsDTO.setRefundAmount(requests.getRefundAmount());

        // Map the foreign key relationship (Rentals to RentalsDTO)
        RentalsDTO rentalsDTO = new RentalsDTO();
        rentalsDTO.setRentalID(requests.getRentals().getRentalID());

        requestsDTO.setRentalsID(rentalsDTO.getRentalID());

        return requestsDTO;
    }

    @Autowired
    public RequestsService(RequestsRepository requestsRepository, RentalsRepository rentalsRepository, ListingsRepository listingsRepository,ChatHistoryService chatHistoryService,ChatHistoryRepository chatHistoryRepository) {
        this.requestsRepository = requestsRepository;
        this.rentalsRepository = rentalsRepository;
        this.listingsRepository = listingsRepository;
        this.chatHistoryService = chatHistoryService;
        this.chatHistoryRepository = chatHistoryRepository;
    }

    // Create a new request
    public Requests createRequest(RequestsDTO requestsDTO) {
        // Fetch the rental by rentalID from the RentalRepository
        Rentals rental = rentalsRepository.findById(requestsDTO.getRentalID()).orElseThrow(()-> new RuntimeException("Rental not found"));

        // Create new request entry
        Requests request = new Requests();
        request.setStatus(requestsDTO.getStatus());
        request.setRefundAmount(requestsDTO.getRefundAmount());
        request.setRentals(rental);
        return requestsRepository.save(request);
    }
//    Example:
//{
//    "rentalID": 2,
//    "status": "SOLD",
//    "refundAmount": 100
//}

    // Get all requests
    public List<Requests> getAllRequests() {
        return requestsRepository.findAll();
    }

    // Get a request by ID
    public Optional<Requests> getRequestById(Long requestID) {
        return requestsRepository.findById(requestID);
    }

    // Update a request
// Update a request
    public Requests updateRequest(Long requestID, RequestsDTO requestsDTO) {
        Requests existingRequest = requestsRepository.findById(requestID)
                .orElseThrow(() -> new RuntimeException("Request not found with ID: " + requestID));

        // Fetch the rental by rentalID from the RentalRepository
        Rentals rental = rentalsRepository.findById(requestsDTO.getRentalID())
                .orElseThrow(() -> new RuntimeException("Rental not found"));

        // Update existing request fields using values from the DTO
        existingRequest.setRentals(rental);
        existingRequest.setStatus(requestsDTO.getStatus());
        existingRequest.setRefundAmount(requestsDTO.getRefundAmount());

        return requestsRepository.save(existingRequest);
    }


    // Delete a request
    public void deleteRequest(Long requestID) {
        Requests existingRequest = requestsRepository.findById(requestID)
                .orElseThrow(() -> new RuntimeException("Request not found with ID: " + requestID));
        requestsRepository.delete(existingRequest);
    }

    public void makeTerminationRequest(long rentalId,long refundAmount) {
        // Fetch the rental details using rentalId
        Rentals rental = rentalsRepository.findById(rentalId)
                .orElseThrow(() -> new RuntimeException("Rental not found with ID: " + rentalId));

        // Fetch the ownerId from the listing table using listingId
        Listings listing = listingsRepository.findById(rental.getListings().getListingID())
                .orElseThrow(() -> new RuntimeException("Listing not found with ID: " + rental.getListings().getListingID()));

        // Create the new request using the existing create function
        RequestsDTO requestsDto = new RequestsDTO();
        
        requestsDto.setRefundAmount(refundAmount);
        requestsDto.setRentalsID(rentalId);
        requestsDto.setStatus("Pending");

        Requests newRequest = createRequest(requestsDto);

        // Create a new chat history entry with the details from the rental row
        ChatHistoryDTO chatHistoryDto = new ChatHistoryDTO();
        chatHistoryDto.setRequest(newRequest.getRequestID());
        chatHistoryDto.setSender(listing.getOwner().getUserID());
        chatHistoryDto.setReceiver(rental.getTenantUserID());
        chatHistoryDto.setRental(null);
        chatHistoryDto.setMessage(null);

        System.out.println("Owner ID: " + listing.getOwner().getUserID());
        System.out.println("Tenant User ID: " + rental.getTenantUserID());
        System.out.println("Listing ID: " + rental.getListings().getListingID());
        
        // Save the chat history entry using the create function
        chatHistoryService.createChatHistory(chatHistoryDto);
    }
}
