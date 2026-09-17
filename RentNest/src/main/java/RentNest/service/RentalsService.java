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

import java.util.Date;
import java.util.List;
import java.util.Locale;
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
        recordStatusChange(rental);

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
    public Rentals updateRental(Long rentalID, RentalsDTO updatedRentalDTO) {
        Optional<Rentals> existingRentalOpt = rentalsRepository.findById(rentalID);
        if (existingRentalOpt.isPresent()) {
            Rentals existingRental = existingRentalOpt.get();

            // Update only the fields you want to change using the DTO
            existingRental.setTenantUserID(updatedRentalDTO.getTenantUserID());
            existingRental.setRentalPrice(updatedRentalDTO.getRentalPrice());
            existingRental.setDepositPrice(updatedRentalDTO.getDepositPrice());
            existingRental.setRentalDate(updatedRentalDTO.getRentalDate());
            existingRental.setLeaseExpiry(updatedRentalDTO.getLeaseExpiry());
            existingRental.setPaymentHistory(updatedRentalDTO.getPaymentHistory());
            existingRental.setStatus(updatedRentalDTO.getStatus());
            recordStatusChange(existingRental);

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
    public void deleteRental(Long rentalID) {
        rentalsRepository.deleteById(rentalID);
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
        Rentals existingRental = rentalsRepository.findById(rentalID)
                .orElseThrow(() -> new RuntimeException("Rental not found"));

        // Change the status from "pending" to "active" to accept the contract
        if ("pending".equals(existingRental.getStatus())) {
            existingRental.setStatus("active");
            recordStatusChange(existingRental);
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

    /**
     * Records, from the server clock, the first time a rental becomes active (accepted) or terminated.
     * Existing times are never overwritten, so repeated updates keep the original moment.
     */
    static void recordStatusChange(Rentals rental) {
        String status = rental.getStatus() == null ? "" : rental.getStatus().trim().toLowerCase(Locale.ROOT);
        if (status.equals("active") && rental.getAcceptedAt() == null) {
            rental.setAcceptedAt(new Date());
        }
        if (status.equals("terminated") && rental.getTerminatedAt() == null) {
            rental.setTerminatedAt(new Date());
        }
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
}