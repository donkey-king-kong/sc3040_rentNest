package RentNest.service;

import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RentalsDTO;
import RentNest.model.ChatHistory;
import RentNest.model.Rentals;
import RentNest.repository.RentalsRepository;
import RentNest.repository.ChatHistoryRepository;
import RentNest.model.Listings;
import RentNest.dto.ListingsDTO;
import RentNest.repository.ListingsRepository;
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
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
public class RentalsService {
    private final UserRepository userRepository;
    private final RentalsRepository rentalsRepository;
    private final ListingsRepository listingsRepository;
    private final ChatHistoryRepository chatHistoryRepository;
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
    public RentalsService(RentalsRepository rentalsRepository, ListingsRepository listingsRepository, UserRepository userRepository, ChatHistoryRepository chatHistoryRepository, RequestsRepository requestsRepository) {
        this.rentalsRepository = rentalsRepository;
        this.listingsRepository = listingsRepository;
        this.userRepository = userRepository;
        this.chatHistoryRepository = chatHistoryRepository;
        this.requestsRepository = requestsRepository;
    }

    // Create a new rental
    @Transactional
    public Rentals createRental(RentalsDTO rentalDTO) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Use the rental offer endpoint to create a rental");
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
        lockListingForRental(rentalID);
        Optional<Rentals> existingRentalOpt = rentalsRepository.findByIdForUpdate(rentalID);
        if (existingRentalOpt.isPresent()) {
            Rentals existingRental = existingRentalOpt.get();
            if (updatedRentalDTO != null) {
                guardProtectedRentalUpdate(existingRental, updatedRentalDTO);
                requirePaymentHistoryOwner(existingRental);
                existingRental.setPaymentHistory(updatedRentalDTO.getPaymentHistory());
                // The endpoint serializes the owner name after this transaction closes.
                Hibernate.initialize(existingRental.getListings().getOwner());
                return rentalsRepository.save(existingRental);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rental update is required");
        } else {
            return null; // or throw an exception if not found
        }
    }

    // Delete a rental
    @Transactional
    public void deleteRental(Long rentalID) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Rental history cannot be deleted through this endpoint");
    }

    @Transactional
    public Rentals createRentalOffer(RentalsDTO rentalDTO, ChatHistoryDTO chatHistoryDTO, Long senderID, Long receiverID) {
        Long actor = currentUserId();
        if (!Objects.equals(actor, senderID)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sender must be the authenticated owner");
        }
        if (rentalDTO == null || rentalDTO.getListingID() == null
                || receiverID == null || Objects.equals(actor, receiverID)
                || !Objects.equals(receiverID, rentalDTO.getTenantUserID())
                || rentalDTO.getRentalPrice() == null || rentalDTO.getRentalPrice() <= 0
                || rentalDTO.getDepositPrice() == null || rentalDTO.getDepositPrice() <= 0
                || rentalDTO.getRentalDate() == null || rentalDTO.getLeaseExpiry() == null
                || !rentalDTO.getLeaseExpiry().after(rentalDTO.getRentalDate())
                || (rentalDTO.getStatus() != null && !"pending".equals(rentalDTO.getStatus()))) {
            throw new IllegalArgumentException("Invalid rental data provided.");
        }
        if (chatHistoryDTO != null && (chatHistoryDTO.getRentalID() != null
                || chatHistoryDTO.getRequestID() != null)) {
            throw new IllegalArgumentException("An offer cannot link an existing rental or request");
        }
        Listings listing = listingsRepository.findByIdForUpdate(rentalDTO.getListingID())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        if (!Objects.equals(actor, listing.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the listing owner can send an offer");
        }
        if (listing.getTenantId() != null || listing.isFlagged() || listing.getOwner().getFlagged() != 0
                || rentalsRepository.findByListings_ListingID(listing.getListingID()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This property is no longer available for an offer");
        }

        boolean listingAlreadyRented = rentalsRepository.findByListings_ListingID(rentalDTO.getListingID())
                .filter(r -> "active".equals(r.getStatus()) || "pending".equals(r.getStatus()))
                .isPresent();
        if (listingAlreadyRented) {
            throw new IllegalArgumentException("Listing already has an active or pending rental.");
        }

        // Fetch the tenant (receiver) by receiverID from UserRepository
        User receiver = userRepository.findById(receiverID)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receiver not found"));

        // Fetch the sender by senderID from UserRepository
        User sender = userRepository.findById(senderID)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Create and save the new rental entry (set tenantUserID correctly)
        Rentals rental = new Rentals();
        rental.setTenantUserID(rentalDTO.getTenantUserID());  // Ensure this is correctly assigned
        rental.setRentalPrice(rentalDTO.getRentalPrice());
        rental.setDepositPrice(rentalDTO.getDepositPrice());
        rental.setRentalDate(rentalDTO.getRentalDate());
        rental.setLeaseExpiry(rentalDTO.getLeaseExpiry());
        rental.setPaymentHistory(null);
        rental.setStatus("pending"); // Set rental status to "pending"
        rental.setListings(listing);
        recordStatusChange(rental);

        Rentals savedRental = rentalsRepository.save(rental); // Save the rental first and get its ID

        // Now that the rental is saved, create the chat history with the rentalID
        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setSender(sender);         // Sender is passed in
        chatHistory.setReceiver(receiver);     // Receiver is passed in
        chatHistory.setRental(savedRental);    // Link the chat history to the rental
        chatHistory.setMessage("Rental Offer"); // You can customize the message if needed

        // Set the request only if it's not null
        chatHistory.setRequest(null);
        chatHistory.setDate(new Date());

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
        Long actor = currentUserId();
        Listings listing = lockListingForRental(rentalID);
        // Get the rental by rentalID else throw an exception if not found
        Rentals existingRental = rentalsRepository.findByIdForUpdate(rentalID)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        if (!Objects.equals(actor, existingRental.getTenantUserID())
                || Objects.equals(actor, existingRental.getOwnerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the offer recipient can accept");
        }
        if (updatedRentalDTO == null
                || (updatedRentalDTO.getTenantUserID() != null && !Objects.equals(actor, updatedRentalDTO.getTenantUserID()))
                || (updatedRentalDTO.getListingID() != null && !Objects.equals(listing.getListingID(), updatedRentalDTO.getListingID()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Offer participants and property cannot be replaced");
        }
        guardTerminationLifecycle(existingRental);
        if (listing.getTenantId() != null || listing.isFlagged() || listing.getOwner().getFlagged() != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This property is no longer available");
        }

        // Change the status from "pending" to "active" to accept the contract
        if ("pending".equals(existingRental.getStatus())) {
            existingRental.setStatus("active");
            recordStatusChange(existingRental);
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rental is not in pending status");
        }

        // Fetch the associated listing using the listingID from the rental contract
        User tenantUser = userRepository.findById(existingRental.getTenantUserID())
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

    public record OfferOption(Long listingId, String name, String address, Integer price, boolean enquired) {}

    @Transactional(readOnly = true)
    public List<OfferOption> getOfferOptions(Long recipientID) {
        Long actor = currentUserId();
        if (recipientID == null || Objects.equals(actor, recipientID)) {
            throw new IllegalArgumentException("Select a different offer recipient");
        }
        if (!userRepository.existsById(recipientID)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient not found");
        }
        var enquired = new java.util.HashSet<>(chatHistoryRepository.findEnquiredListingIds(recipientID, actor));
        return listingsRepository.findOfferCandidates(actor).stream()
                .map(l -> new OfferOption(l.getListingID(), l.getName(), l.getLocation(), l.getPrice(),
                        enquired.contains(l.getListingID())))
                .sorted(java.util.Comparator.comparing(OfferOption::enquired).reversed())
                .toList();
    }

    // All lifecycle writers lock listing first, then rental, avoiding lock inversion.
    private Listings lockListingForRental(Long rentalId) {
        Long listingId = rentalsRepository.findListingIdByRentalID(rentalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found"));
        return listingsRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return user.getUserID();
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

}
