package RentNest.service;

import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RentalsDTO;
import RentNest.model.ChatHistory;
import RentNest.model.Rentals;
import RentNest.repository.RentalsRepository;
import RentNest.dto.ChatHistoryDTO;
import RentNest.repository.ChatHistoryRepository;
import RentNest.model.Listings;
import RentNest.dto.ListingsDTO;
import RentNest.repository.ListingsRepository;
import RentNest.model.Requests;
import RentNest.repository.RequestsRepository;
import RentNest.model.User;
import RentNest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.hibernate.Hibernate;

import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class RentalsService {
    private final UserRepository userRepository;
    private final RentalsRepository rentalsRepository;
    private final ListingsRepository listingsRepository;
    private final ChatHistoryRepository chatHistoryRepository;
    private final ChatHistoryService chatHistoryService;
    private final RequestsRepository requestsRepository;

    // Mapping Rentals to RentalsDTO
    public RentalsDTO toRentalsDTO(Rentals rentals) {
        RentalsDTO rentalsDTO = new RentalsDTO();

        rentalsDTO.setRentalID(rentals.getRentalID());

        // Map basic fields
        rentalsDTO.setTenantUserID(rentals.getTenantUserID());
        rentalsDTO.setRentalPrice(rentals.getRentalPrice());
        rentalsDTO.setDepositPrice(rentals.getDepositPrice());
        rentalsDTO.setRentalDate(rentals.getRentalDate());
        rentalsDTO.setLeaseExpiry(rentals.getLeaseExpiry());
        rentalsDTO.setPaymentHistory(rentals.getPaymentHistory());
        rentalsDTO.setStatus(rentals.getStatus());
        rentalsDTO.setCreatedAt(rentals.getCreatedAt());
        rentalsDTO.setAcceptedAt(rentals.getAcceptedAt());
        rentalsDTO.setTerminatedAt(rentals.getTerminatedAt());

        // Map the foreign key relationship (Listing to RentalsDTO)
        ListingsDTO listingsDTO = new ListingsDTO();
        listingsDTO.setListingID(rentals.getListings().getListingID());

        rentalsDTO.setListingsID(listingsDTO.getListingID());

        return rentalsDTO;
    }

    @Autowired
    public RentalsService(RentalsRepository rentalsRepository, ListingsRepository listingsRepository, UserRepository userRepository, ChatHistoryRepository chatHistoryRepository, ChatHistoryService chatHistoryService, RequestsRepository requestsRepository) {
        this.rentalsRepository = rentalsRepository;
        this.listingsRepository = listingsRepository;
        this.userRepository = userRepository;
        this.chatHistoryRepository = chatHistoryRepository;
        this.chatHistoryService = chatHistoryService;
        this.requestsRepository = requestsRepository;
    }

    // Create a new rental
    @Transactional
    public Rentals createRental(RentalsDTO rentalDTO) {
        rejectDirectTermination(rentalDTO.getStatus());
        // Validate the input data first
        if (rentalDTO.getListingID() == null || rentalDTO.getTenantUserID() == null || rentalDTO.getRentalPrice() <= 0) {
            throw new IllegalArgumentException("Invalid rental data provided.");
        }

        // Fetch the listing by listingID from the ListingsRepository
        Listings listing = listingsRepository.findById(rentalDTO.getListingID()).orElseThrow(()-> new RuntimeException("Listing not found"));

        // Create new rental entry
        Rentals rental = new Rentals();
        rental.setTenantUserID(rentalDTO.getTenantUserID());
        rental.setRentalPrice(rentalDTO.getRentalPrice());
        rental.setDepositPrice(rentalDTO.getDepositPrice());
        rental.setRentalDate(rentalDTO.getRentalDate());
        rental.setLeaseExpiry(rentalDTO.getLeaseExpiry());
        rental.setPaymentHistory(rentalDTO.getPaymentHistory());
        rental.setStatus(rentalDTO.getStatus());
        rental.setListings(listing);
        setInitialStatusTimestamps(rental);

        return rentalsRepository.save(rental);
    }
//    Example:
//    *** MAKE SURE THE listingID ALREADY EXIST BEFORE YOU TEST
//    {
//          "listingID": 5,
//          "tenantUserID": 3, // Replace with a valid tenant user ID
//          "rentalPrice": 2000, // Example rental price
//          "depositPrice": 3000, // Example deposit price
//          "rentalDate": "2024-09-30", // Example rental date in yyyy-MM-dd format
//          "leaseExpiry": "2026-09-30", // Example lease expiry date in yyyy-MM-dd format
//          "paymentHistory": "First payment made on 2024-09-30", // Example payment history
//          "status": "active" // Example status
//    }

    // Read all rentals
    public List<Rentals> getAllRentals() {
        return rentalsRepository.findAll();
    }

    // Read a rental by ID
    public Optional<Rentals> getRentalById(Long rentalID) {
        return rentalsRepository.findById(rentalID);
    }

    // Get Rental by ListingID
    public Optional<Rentals> getRentalByListingId(Long listingID) {
        if (listingID == null) {
            throw new IllegalArgumentException("Listing ID cannot be null");
        }
        return rentalsRepository.findByListings_ListingID(listingID);
    }

    // Update a rental
    @Transactional
    public Rentals updateRental(Long rentalID, RentalsDTO updatedRentalDTO) {
        Optional<Rentals> existingRentalOpt = rentalsRepository.findByIdForUpdate(rentalID);
        if (existingRentalOpt.isPresent()) {
            Rentals existingRental = existingRentalOpt.get();
            if (hasProtectedLifecycle(existingRental)) {
                guardProtectedRentalUpdate(existingRental, updatedRentalDTO);
                requirePaymentHistoryOwner(existingRental);
                existingRental.setPaymentHistory(updatedRentalDTO.getPaymentHistory());
                // The endpoint serializes the owner name after this transaction closes.
                Hibernate.initialize(existingRental.getListings().getOwner());
                return rentalsRepository.save(existingRental);
            }
            rejectDirectTermination(updatedRentalDTO.getStatus());

            // Update only the fields you want to change using the DTO
            existingRental.setTenantUserID(updatedRentalDTO.getTenantUserID());
            existingRental.setRentalPrice(updatedRentalDTO.getRentalPrice());
            existingRental.setDepositPrice(updatedRentalDTO.getDepositPrice());
            existingRental.setRentalDate(updatedRentalDTO.getRentalDate());
            existingRental.setLeaseExpiry(updatedRentalDTO.getLeaseExpiry());
            existingRental.setPaymentHistory(updatedRentalDTO.getPaymentHistory());
            applyStatusTransition(existingRental, updatedRentalDTO.getStatus());

            // Fetch the listing by listingID from the ListingsRepository
            Listings listing = listingsRepository.findById(updatedRentalDTO.getListingID())
                    .orElseThrow(() -> new RuntimeException("Listing not found"));

            existingRental.setListings(listing);

            return rentalsRepository.save(existingRental);
        } else {
            return null; // or throw an exception if not found
        }
    }

    // Delete a rental
    @Transactional
    public void deleteRental(Long rentalID) {
        rentalsRepository.findByIdForUpdate(rentalID).ifPresent(rental -> {
            guardTerminationLifecycle(rental);
            rentalsRepository.delete(rental);
        });
    }

    @Transactional
    public Rentals createRentalOffer(RentalsDTO rentalDTO, ChatHistoryDTO chatHistoryDTO, Long senderID, Long receiverID) {
        // Validate the input data for rental
        if (rentalDTO.getListingID() == null || rentalDTO.getTenantUserID() == null || rentalDTO.getRentalPrice() <= 0) {
            throw new IllegalArgumentException("Invalid rental data provided.");
        }

        // Fetch the listing by listingID from ListingsRepository
        Listings listing = listingsRepository.findById(rentalDTO.getListingID())
                .orElseThrow(() -> new RuntimeException("Listing not found"));

        // Fetch the tenant (receiver) by receiverID from UserRepository
        User receiver = userRepository.findById(receiverID)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        // Fetch the sender by senderID from UserRepository
        User sender = userRepository.findById(senderID)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Check if chatHistoryDTO has a non-null requestID
        Requests requests = null;
        if (chatHistoryDTO.getRequestID() != null) {
            // Fetch the request if applicable (from chatHistoryDTO)
            requests = requestsRepository.findById(chatHistoryDTO.getRequestID())
                    .orElseThrow(() -> new RuntimeException("Request not found"));
        }

        // Create and save the new rental entry (set tenantUserID correctly)
        Rentals rental = new Rentals();
        rental.setTenantUserID(rentalDTO.getTenantUserID());  // Ensure this is correctly assigned
        rental.setRentalPrice(rentalDTO.getRentalPrice());
        rental.setDepositPrice(rentalDTO.getDepositPrice());
        rental.setRentalDate(rentalDTO.getRentalDate());
        rental.setLeaseExpiry(rentalDTO.getLeaseExpiry());
        rental.setPaymentHistory(rentalDTO.getPaymentHistory());
        rental.setStatus("pending"); // Set rental status to "pending"
        rental.setListings(listing);
        setInitialStatusTimestamps(rental);

        Rentals savedRental = rentalsRepository.save(rental); // Save the rental first and get its ID

        // Now that the rental is saved, create the chat history with the rentalID
        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setSender(sender);         // Sender is passed in
        chatHistory.setReceiver(receiver);     // Receiver is passed in
        chatHistory.setRental(savedRental);    // Link the chat history to the rental
        chatHistory.setMessage("Rental Offer"); // You can customize the message if needed

        // Set the request only if it's not null
        chatHistory.setRequest(requests);
        chatHistory.setDate(chatHistoryDTO.getDate());

        chatHistoryRepository.save(chatHistory); // Save the chat history

        // Return the created rental entry
        return savedRental;
    }

    /* FORMAT
        {
            "rentalDTO": {
                "listingID": 16, // Make sure listingID exists
                "tenantUserID": 5, // Following parameters passed into URL
                "rentalPrice": 2000,
                "depositPrice": 3000,
                "rentalDate": "2024-09-30",
                "leaseExpiry": "2026-09-30",
                "paymentHistory": "First payment made on 2024-09-30",
                "status": "pending" // Fix it as pending
            },
            "chatHistoryDTO": {
                "request": 4, // Make sure request ID exists
                "date": "2024-09-30T12:00:00Z"
            }
        }
     */

    /*
        CRUD operation on rental table
        Update row for status from pending -> active
        Update row with userID under tenantID in listing table
     */

    @Transactional
    public Rentals reviewRentalOffer(Long rentalID, RentalsDTO updatedRentalDTO) {
        // Get the rental by rentalID else throw an exception if not found
        Rentals existingRental = rentalsRepository.findByIdForUpdate(rentalID)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        guardTerminationLifecycle(existingRental);

        // Change the status from "pending" to "active" to accept the contract
        if ("pending".equals(existingRental.getStatus())) {
            existingRental.setStatus("active");
            if (existingRental.getAcceptedAt() == null) {
                existingRental.setAcceptedAt(new Date());
            }
        } else {
            throw new RuntimeException("Rental is not in pending status");
        }

        // Fetch the associated listing using the listingID from the rental contract
        Listings listing = listingsRepository.findById(existingRental.getListings().getListingID())
                .orElseThrow(() -> new RuntimeException("Listing not found"));

        // Get the tenant user by tenantUserID from the DTO
        User tenantUser = userRepository.findById(updatedRentalDTO.getTenantUserID())
                .orElseThrow(() -> new RuntimeException("Tenant user not found"));

        // Update the tenant in the listing to reflect the accepted contract
        listing.setTenant(tenantUser);

        // Save the updated listing with the new tenant
        listingsRepository.save(listing);

        // Save and return the updated rental with the new status
        return rentalsRepository.save(existingRental);
    }

    /* Example PUT Request Body
        {
            "listingID": 8,            // Valid listingID that exists in the Listings table
            "tenantUserID": 6,         // Valid tenantUserID where the UserID exists in the User table
            "status": "active"        // Put as active as we are changing the status from pending to active
        }
     */

    // Get rental by listingID and tenantID
    public Optional<RentalsDTO> getRentalByListingIdAndTenantId(Long listingID, Long tenantID) {
        return rentalsRepository.findByListings_ListingIDAndTenantUserID(listingID, tenantID)
                .map(this::toRentalsDTO);  // Map to RentalsDTO if found
    }

    public List<Long> manageTenants(Long listingID) {
        // Fetch the list of tenant IDs based on the ownerID
        List<Long> tenantIDs = rentalsRepository.findTenantUserIDsByListingID(listingID);

        // If there are no tenants for this owner, throw exception
        if (tenantIDs.isEmpty()) {
            throw new IllegalArgumentException("No tenants found for listingID: " + listingID);
        }
        return tenantIDs;
    }

    private void setInitialStatusTimestamps(Rentals rental) {
        Date now = new Date();
        if ("active".equals(rental.getStatus()) && rental.getAcceptedAt() == null) {
            rental.setAcceptedAt(now);
        }
        if ("terminated".equals(rental.getStatus()) && rental.getTerminatedAt() == null) {
            rental.setTerminatedAt(now);
        }
    }

    private void rejectDirectTermination(String status) {
        if (status != null && "terminated".equalsIgnoreCase(status.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Use the request decision endpoint to terminate a rental");
        }
    }

    private void guardTerminationLifecycle(Rentals rental) {
        if (hasProtectedLifecycle(rental)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Active, terminated, and request-linked rentals cannot be changed through generic rental mutations");
        }
    }

    private boolean hasProtectedLifecycle(Rentals rental) {
        return "active".equalsIgnoreCase(rental.getStatus()) || "terminated".equalsIgnoreCase(rental.getStatus())
                || rental.getTerminatedAt() != null
                || requestsRepository.existsByRentals_RentalID(rental.getRentalID());
    }

    private void guardProtectedRentalUpdate(Rentals rental, RentalsDTO dto) {
        if (!Objects.equals(rental.getTenantUserID(), dto.getTenantUserID())
                || !Objects.equals(rental.getListingId(), dto.getListingID())
                || !Objects.equals(rental.getRentalPrice(), dto.getRentalPrice())
                || !Objects.equals(rental.getDepositPrice(), dto.getDepositPrice())
                || !sameDate(rental.getRentalDate(), dto.getRentalDate())
                || !sameDate(rental.getLeaseExpiry(), dto.getLeaseExpiry())
                || !Objects.equals(rental.getStatus(), dto.getStatus())
                || (dto.getRentalID() != null && !Objects.equals(rental.getRentalID(), dto.getRentalID()))
                // Server-managed timestamps may be omitted, but cannot be rewritten.
                || (dto.getCreatedAt() != null && !sameDate(rental.getCreatedAt(), dto.getCreatedAt()))
                || (dto.getAcceptedAt() != null && !sameDate(rental.getAcceptedAt(), dto.getAcceptedAt()))
                || (dto.getTerminatedAt() != null && !sameDate(rental.getTerminatedAt(), dto.getTerminatedAt()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only payment history can be updated for active, terminated, or request-linked rentals");
        }
    }

    private boolean sameDate(Date first, Date second) {
        return first == null ? second == null : second != null && first.getTime() == second.getTime();
    }

    private void requirePaymentHistoryOwner(Rentals rental) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof User user) || user.getUserID() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (!Objects.equals(user.getUserID(), rental.getOwnerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the rental owner can update payment history");
        }
    }

    private void applyStatusTransition(Rentals rental, String newStatus) {
        String previousStatus = rental.getStatus();
        rental.setStatus(newStatus);

        if ("active".equals(newStatus) && !"active".equals(previousStatus) && rental.getAcceptedAt() == null) {
            rental.setAcceptedAt(new Date());
        }
        if ("terminated".equals(newStatus) && !"terminated".equals(previousStatus) && rental.getTerminatedAt() == null) {
            rental.setTerminatedAt(new Date());
        }
    }
}
