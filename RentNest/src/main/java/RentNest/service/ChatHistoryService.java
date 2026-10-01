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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ChatHistoryService {

    private final ChatHistoryRepository chatHistoryRepository;
    private final UserRepository userRepository;
    private final RentalsRepository rentalsRepository;
    private final RequestsRepository requestsRepository;

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
        chatHistoryDTO.setRental(chatHistory.getRental().getRentalID());
        chatHistoryDTO.setRequest(chatHistory.getRequest().getRequestID());

        return chatHistoryDTO;
    }

    @Autowired
    public ChatHistoryService(ChatHistoryRepository chatHistoryRepository, UserRepository userRepository, RentalsRepository rentalsRepository, RequestsRepository requestsRepository) {
        this.chatHistoryRepository = chatHistoryRepository;
        this.userRepository = userRepository;
        this.rentalsRepository = rentalsRepository;
        this.requestsRepository = requestsRepository;
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
