package RentNest.service;

import RentNest.dto.ChatHistoryDTO;
import RentNest.model.ChatHistory;
import RentNest.model.Rentals;
import RentNest.dto.RentalsDTO;
import RentNest.repository.RentalsRepository;
import RentNest.repository.ChatHistoryRepository;
import RentNest.model.Requests;
import RentNest.dto.RequestsDTO;
import RentNest.repository.RequestsRepository;
import RentNest.model.User;
import RentNest.dto.UserDTO;
import RentNest.repository.UserRepository;
import RentNest.repository.ListingsRepository;
import RentNest.model.Listings;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Objects;
import java.util.Date;

@Service
public class ChatHistoryService {

    private final ChatHistoryRepository chatHistoryRepository;
    private final UserRepository userRepository;
    private final RentalsRepository rentalsRepository;
    private final RequestsRepository requestsRepository;
    private final ListingsRepository listingsRepository;

    // Mapping ChatHistory to ChatHistoryDTO
    public ChatHistoryDTO toChatHistoryDTO(ChatHistory chatHistory) {
        ChatHistoryDTO chatHistoryDTO = new ChatHistoryDTO();

        // Map basic fields
        chatHistoryDTO.setMessage(chatHistory.getMessage());
        chatHistoryDTO.setDate(chatHistory.getDate());

        // Map the foreign key relationships
        UserDTO userDTO = new UserDTO();
        RentalsDTO rentalsDTO = new RentalsDTO();
        RequestsDTO requestsDTO = new RequestsDTO();

        chatHistoryDTO.setSender(chatHistory.getSender().getUserID());
        chatHistoryDTO.setReceiver(chatHistory.getReceiver().getUserID());
        chatHistoryDTO.setRental(chatHistory.getRentalId());
        chatHistoryDTO.setRequest(chatHistory.getRequestId());
        chatHistoryDTO.setListingID(chatHistory.getListingId());

        return chatHistoryDTO;
    }

    @Autowired
    public ChatHistoryService(ChatHistoryRepository chatHistoryRepository, UserRepository userRepository, RentalsRepository rentalsRepository, RequestsRepository requestsRepository,
                              ListingsRepository listingsRepository) {
        this.chatHistoryRepository = chatHistoryRepository;
        this.userRepository = userRepository;
        this.rentalsRepository = rentalsRepository;
        this.requestsRepository = requestsRepository;
        this.listingsRepository = listingsRepository;
    }

    // Public messages cannot manufacture system rental/request cards.
    @Transactional
    public ChatHistory sendMessage(ChatHistoryDTO dto) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User actor)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (dto == null || dto.getReceiverID() == null || Objects.equals(dto.getReceiverID(), actor.getUserID())
                || dto.getMessage() == null || dto.getMessage().isBlank() || dto.getMessage().length() > 255
                || dto.getRentalID() != null || dto.getRequestID() != null) {
            throw new IllegalArgumentException("Provide a message of 1-255 characters and a different recipient");
        }
        if (dto.getSenderID() != null && !Objects.equals(actor.getUserID(), dto.getSenderID())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sender must match your account");
        }
        Listings listing = null;
        if (dto.getListingID() != null) {
            listing = listingsRepository.findByIdForUpdate(dto.getListingID())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
            if (!Objects.equals(listing.getOwnerId(), dto.getReceiverID())) {
                throw new IllegalArgumentException("The recipient must own the enquired-about listing");
            }
            if (listing.isFlagged() || listing.getOwner().getFlagged() != 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is unavailable");
            }
        }
        dto.setSender(actor.getUserID());
        dto.setDate(new Date());
        ChatHistory chat = createChatHistory(dto);
        if (listing != null) {
            chat.setListing(listing);
            chat.setListingNameSnapshot(listing.getName() == null ? "Property " + listing.getListingID() : listing.getName());
            chat.setListingAddressSnapshot(listing.getLocation());
        }
        return chatHistoryRepository.save(chat);
    }

    // Create a new chat history entry
    @Transactional
    public ChatHistory createChatHistory(ChatHistoryDTO chatHistoryDTO) {
        // Fetch the relevant IDs
        User sender = userRepository.findById(chatHistoryDTO.getSenderID())
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findById(chatHistoryDTO.getReceiverID())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));
        Rentals rental = chatHistoryDTO.getRentalID() != null ? rentalsRepository.findById(chatHistoryDTO.getRentalID())
                .orElseThrow(() -> new RuntimeException("Rental not found")) : null;
        Requests requests = chatHistoryDTO.getRequestID() != null ? requestsRepository.findById(chatHistoryDTO.getRequestID())
                .orElseThrow(() -> new RuntimeException("Request not found")) : null;
        // Create a new chat history entity
        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setReceiver(receiver);
        chatHistory.setSender(sender);
        chatHistory.setRental(rental);
        chatHistory.setRequest(requests);
        chatHistory.setMessage(chatHistoryDTO.getMessage());
        chatHistory.setDate(chatHistoryDTO.getDate());

        return chatHistoryRepository.save(chatHistory);
    }
//    Example:
//{
//    "receiverID": 6,
//    "senderID": 5,
//    "rentalID": 4,  // Make sure this rentalID exists
//    "requestID": 4, // Make sure this requestID exist
//    "message": "Hello, this is a test message.",
//    "date": "2024-10-06T12:00:00Z"
//}


    // Retrieve all chat history entries
    public List<ChatHistory> getAllChatHistories() {
        return chatHistoryRepository.findAll();
    }

    // Retrieve a chat history entry by ID
    public Optional<ChatHistory> getChatHistoryById(Long messageID) {
        return chatHistoryRepository.findById(messageID);
    }

    // Delete a chat history entry
    public void deleteChatHistory(Long messageID) {
        chatHistoryRepository.deleteById(messageID);
    }

    // Get chat history from rentalID
     public List<ChatHistory> getChatHistoriesByRentalID(Long rentalID) {
        return chatHistoryRepository.findByRental_RentalID(rentalID);
    }

    // Get chat history entries by user ID where the user appears as either sender or receiver
    public List<ChatHistory> getChatHistoriesByUserID(Long userID) {
        return chatHistoryRepository.findBySender_UserIDOrReceiver_UserID(userID, userID);
    }

    public List<Long> getChatPartnerIDsByUserID(Long userID) {
        return chatHistoryRepository.findDistinctChatPartnerIDsByUserID(userID);
    }

    // Get the conversation between two users sorted by date
    public List<ChatHistory> getConversationBetweenUsers(Long userA, Long userB) {
        try {
            return chatHistoryRepository.findConversationBetweenUsers(userA, userB);
        } catch (Exception e) {
            throw new RuntimeException("Error occurred while fetching the conversation between users.");
        }
    }
}
