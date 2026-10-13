package RentNest.service;

import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RequestsDTO;
import RentNest.model.Requests;
import RentNest.repository.RequestsRepository;
import RentNest.model.Rentals;
import RentNest.dto.RentalsDTO;
import RentNest.repository.RentalsRepository;
import RentNest.repository.ListingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import RentNest.model.User;

import java.util.Date;
import java.util.Objects;
import java.util.Optional;
import java.util.List;

@Service
public class RequestsService {

    private final RequestsRepository requestsRepository;
    private final RentalsRepository rentalsRepository;
    private final ChatHistoryService chatHistoryService;
    private final ListingsRepository listingsRepository;

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
    public RequestsService(RequestsRepository requestsRepository, RentalsRepository rentalsRepository, ChatHistoryService chatHistoryService,
                           ListingsRepository listingsRepository) {
        this.requestsRepository = requestsRepository;
        this.rentalsRepository = rentalsRepository;
        this.chatHistoryService = chatHistoryService;
        this.listingsRepository = listingsRepository;
    }

    // Legacy writes cannot bypass the termination commands.
    public Requests createRequest(RequestsDTO requestsDTO) {
        throw legacyMutation();
    }

    // Get all requests
    @Transactional(readOnly = true)
    public List<Requests> getAllRequests() {
        Long actor = currentUserId();
        return requestsRepository.findAllForParticipant(actor);
    }

    // Get a request by ID
    @Transactional(readOnly = true)
    public Optional<Requests> getRequestById(Long requestID) {
        Long actor = currentUserId();
        Optional<Requests> request = requestsRepository.findById(requestID);
        request.ifPresent(value -> {
            if (!isParticipant(value.getRentals(), actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only rental participants can view this request");
            }
        });
        return request;
    }

    public Requests updateRequest(Long requestID, RequestsDTO requestsDTO) {
        throw legacyMutation();
    }


    // Delete a request
    public void deleteRequest(Long requestID) {
        throw legacyMutation();
    }

    @Transactional
    public void makeTerminationRequest(long rentalId, long refundAmount) {
        Long actor = currentUserId();
        if (refundAmount < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refund amount must be a nonnegative whole number");
        }
        Rentals rental = lockedRental(rentalId);
        if (!Objects.equals(actor, rental.getOwnerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the rental owner can initiate termination");
        }
        requireActive(rental);
        if (rental.getTenantUserID() == null || Objects.equals(actor, rental.getTenantUserID())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rental must have a distinct tenant");
        }
        // The existing one-to-one mapping permits one retained request per rental.
        if (requestsRepository.existsByRentals_RentalID(rentalId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A termination request already exists for this rental");
        }
        Requests newRequest = new Requests();
        newRequest.setRefundAmount(refundAmount);
        newRequest.setRentals(rental);
        newRequest.setStatus("Pending");
        requestsRepository.save(newRequest);

        // Create a new chat history entry with the details from the rental row
        ChatHistoryDTO chatHistoryDto = new ChatHistoryDTO();
        chatHistoryDto.setRequest(newRequest.getRequestID());
        chatHistoryDto.setSender(actor);
        chatHistoryDto.setReceiver(rental.getTenantUserID());
        chatHistoryDto.setRental(null);
        chatHistoryDto.setMessage("Lease Termination"); 

        chatHistoryDto.setDate(new Date());
        
        // Save the chat history entry using the create function
        chatHistoryService.createChatHistory(chatHistoryDto);
    }

    @Transactional
    public Requests decideTermination(Long requestId, String decision) {
        Long actor = currentUserId();
        if (!"accept".equals(decision) && !"reject".equals(decision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be 'accept' or 'reject'");
        }
        // Read only the scalar ID before locking, avoiding a stale managed request while waiting.
        Long rentalId = requestsRepository.findRentalIdByRequestID(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        Rentals rental = lockedRental(rentalId);
        Requests request = requestsRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!Objects.equals(actor, rental.getTenantUserID()) || Objects.equals(actor, rental.getOwnerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the rental tenant can decide termination");
        }
        String targetStatus = "accept".equals(decision) ? "terminated" : "rejected";
        if (targetStatus.equals(request.getStatus())) {
            if ("terminated".equals(targetStatus)
                    && (!"terminated".equals(rental.getStatus()) || rental.getTerminatedAt() == null)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Inconsistent termination requires reconciliation");
            }
            return request;
        }
        if (!"Pending".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request has already been decided");
        }
        requireActive(rental);
        if ("accept".equals(decision)) {
            if (!Objects.equals(rental.getListings().getTenantId(), rental.getTenantUserID())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing occupancy requires reconciliation");
            }
            rental.getListings().setTenant(null);
            rental.setStatus("terminated");
            rental.setTerminatedAt(new Date());
            rentalsRepository.save(rental);
        }
        request.setStatus(targetStatus);
        return requestsRepository.save(request);
    }

    private Rentals lockedRental(Long rentalId) {
        Long listingId = rentalsRepository.findListingIdByRentalID(rentalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found"));
        listingsRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        return rentalsRepository.findByIdForUpdate(rentalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found"));
    }

    private void requireActive(Rentals rental) {
        if (!"active".equals(rental.getStatus()) || rental.getTerminatedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only an active rental can be terminated");
        }
    }

    private boolean isParticipant(Rentals rental, Long actor) {
        return rental != null && (Objects.equals(actor, rental.getTenantUserID())
                || Objects.equals(actor, rental.getOwnerUserId()));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof User user) || user.getUserID() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return user.getUserID();
    }

    private ResponseStatusException legacyMutation() {
        currentUserId();
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Use the terminationrequest creation or request decision endpoint; request terms and history are immutable");
    }
}
