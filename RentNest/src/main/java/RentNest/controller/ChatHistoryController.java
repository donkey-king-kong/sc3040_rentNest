package RentNest.controller;

import RentNest.model.ChatHistory;
import RentNest.dto.ChatHistoryDTO;
import RentNest.service.ChatHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import RentNest.model.User;
import RentNest.repository.UserRepository;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/chathistory")
public class ChatHistoryController {

    private final UserRepository userRepository;
    private final ChatHistoryService chatHistoryService;

    @Autowired
    public ChatHistoryController(ChatHistoryService chatHistoryService, UserRepository userRepository) {
        this.chatHistoryService = chatHistoryService;
        this.userRepository = userRepository;
    }

    // Create a new chat history entry
    @PostMapping
    public ResponseEntity<?> createChatHistory(@RequestBody ChatHistoryDTO chatHistoryDTO) {
        try {
            // Attempt to create the chat history entry
            ChatHistory createdChatHistory = chatHistoryService.createChatHistory(chatHistoryDTO);

            if (createdChatHistory == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to create a new chat history entry. Please verify the provided information.");
            }

            return new ResponseEntity<>(createdChatHistory, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            // Handle bad input data
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid input data: " + e.getMessage());
        } catch (RuntimeException e) {
            // Handle cases where entities like User, Rental, or Request do not exist
            if (e.getMessage().contains("Sender not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("The sender user ID provided does not exist. Please provide a valid sender user ID.");
            } else if (e.getMessage().contains("Receiver not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("The receiver user ID provided does not exist. Please provide a valid receiver user ID.");
            } else if (e.getMessage().contains("Rental not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("The rental ID provided does not exist. Please provide a valid rental ID.");
            } else if (e.getMessage().contains("Request not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("The request ID provided does not exist. Please provide a valid request ID.");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Error: " + e.getMessage());
            }
        } catch (Exception e) {
            // Handle all other exceptions
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred. Please check your data and try again later.");
        }
    }

    // Retrieve all chat history entries
    @GetMapping
    public ResponseEntity<List<ChatHistory>> getAllChatHistories() {
        List<ChatHistory> chatHistories = chatHistoryService.getAllChatHistories();
        return new ResponseEntity<>(chatHistories, HttpStatus.OK);
    }

    // Retrieve a chat history entry by ID
    @GetMapping("/{id}")
    public ResponseEntity<ChatHistory> getChatHistoryById(@PathVariable("id") Long messageID) {
        Optional<ChatHistory> chatHistory = chatHistoryService.getChatHistoryById(messageID);
        return chatHistory.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Delete a chat history entry
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChatHistory(@PathVariable("id") Long messageID) {
        chatHistoryService.deleteChatHistory(messageID);
        return ResponseEntity.noContent().build();
    }

    // Get list of chat history from specified rentalID
    @GetMapping("/chat/{rentalID}") // localhost:8080/api/chathistory/chat/4
    public ResponseEntity<List<ChatHistory>> getChatHistoriesByRentalID(@PathVariable("rentalID") Long rentalID) {
        List<ChatHistory> chatHistories = chatHistoryService.getChatHistoriesByRentalID(rentalID);
        if (chatHistories.isEmpty()){
            return new ResponseEntity<>(HttpStatus.NO_CONTENT); // Exception if no chatHistories from RentalID 
        }
        return new ResponseEntity<>(chatHistories, HttpStatus.OK);
    }

    // Won't sendMessage() will be the same as "Create a new chat history entry?" see above^

    // Get chat histories by user ID (user can either be sender or receiver)
    @GetMapping("/user/{userID}")
    public ResponseEntity<?> getChatHistoriesByUserID(@PathVariable("userID") Long userID) {
        try {
            List<ChatHistory> chatHistories = chatHistoryService.getChatHistoriesByUserID(userID);
            if (chatHistories.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).body("No chat histories found for the given user ID.");
            }
            return ResponseEntity.ok(chatHistories);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid user ID provided: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error occurred while retrieving the chat histories. Please try again later.");
        }
    }

    // Get chat partners by user ID (user can either be sender or receiver)
    @GetMapping("/user/{userID}/partners")
    public ResponseEntity<?> getChatPartnerIDsByUserID(@PathVariable("userID") Long userID) {
        try {
            // Get chat partners from the existing method
            List<Long> chatPartnerIDs = chatHistoryService.getChatPartnerIDsByUserID(userID);

            // Check if there are any chat partners
            if (chatPartnerIDs.isEmpty()) {
                // Check if the user has been involved in any chats as a sender or receiver
                List<ChatHistory> userChatHistories = chatHistoryService.getChatHistoriesByUserID(userID);
                if (userChatHistories.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body("User " + userID + " does not exist OR have no chat partners. Please provide a valid user ID.");
                }
            }

            // If chat partners are found, return them
            return ResponseEntity.ok(chatPartnerIDs);

        } catch (Exception e) {
            // Handle all other unexpected exceptions
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred: " + e.getMessage());
        }

    }

    // Get conversation between two users sorted by date
    /*
        ***NOTE**
        For endpoint: /api/chathistory/conversation?userA={userID}&userB={userID}
     */
    // Get conversation between two users
    @GetMapping("/conversation")
    public ResponseEntity<?> getConversationBetweenUsers(@RequestParam("userA") Long userA, @RequestParam("userB") Long userB) {
        try {
            // Check if both users exist
            Optional<User> userAExists = userRepository.findById(userA);
            Optional<User> userBExists = userRepository.findById(userB);

            if (userAExists.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("User " + userA + " does not exist. Please provide a valid user ID.");
            }

            if (userBExists.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("User " + userB + " does not exist. Please provide a valid user ID.");
            }

            // Fetch the conversation if both users exist
            List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

            // If no conversation found, but both users exist change status code to 202 to display message
            // Respond with a descriptive message
            if (conversation.isEmpty()) {
                return ResponseEntity.status(HttpStatus.OK)
                        .body("No messages found between user " + userA + " and user " + userB + ".");
            }

            return ResponseEntity.ok(conversation);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while retrieving the conversation: " + e.getMessage());
        }
    }
}