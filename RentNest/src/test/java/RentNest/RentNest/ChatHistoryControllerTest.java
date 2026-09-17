package RentNest.RentNest;

import RentNest.controller.ChatHistoryController;
import RentNest.dto.ChatHistoryDTO;
import RentNest.model.ChatHistory;
import RentNest.model.User;
import RentNest.service.ChatHistoryService;
import RentNest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatHistoryControllerTest {

    @InjectMocks
    private ChatHistoryController chatHistoryController;

    @Mock
    private ChatHistoryService chatHistoryService;

    @Mock
    private UserRepository userRepository;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testCreateChatHistory() {
        // Given
        ChatHistoryDTO chatHistoryDTO = new ChatHistoryDTO();
        chatHistoryDTO.setSender(1L);
        chatHistoryDTO.setReceiver(2L);
        chatHistoryDTO.setMessage("Hello");
        chatHistoryDTO.setDate(new Date());

        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setMessageID(1L);
        chatHistory.setMessage("Hello");

        when(chatHistoryService.createChatHistory(chatHistoryDTO)).thenReturn(chatHistory);

        // When
        ResponseEntity<?> response = chatHistoryController.createChatHistory(chatHistoryDTO);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(chatHistory, response.getBody());
    }

    @Test
    public void testGetAllChatHistories() {
        // Given
        ChatHistory chatHistory1 = new ChatHistory();
        chatHistory1.setMessage("Hello 1");

        ChatHistory chatHistory2 = new ChatHistory();
        chatHistory2.setMessage("Hello 2");

        List<ChatHistory> chatHistories = Arrays.asList(chatHistory1, chatHistory2);
        when(chatHistoryService.getAllChatHistories()).thenReturn(chatHistories);

        // When
        ResponseEntity<List<ChatHistory>> response = chatHistoryController.getAllChatHistories();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chatHistories, response.getBody());
    }

    @Test
    public void testGetChatHistoryById() {
        // Given
        Long messageID = 1L;
        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setMessageID(messageID);
        when(chatHistoryService.getChatHistoryById(messageID)).thenReturn(Optional.of(chatHistory));

        // When
        ResponseEntity<ChatHistory> response = chatHistoryController.getChatHistoryById(messageID);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chatHistory, response.getBody());
    }

    @Test
    public void testGetChatHistoryByIdNotFound() {
        // Given
        Long messageID = 1L;
        when(chatHistoryService.getChatHistoryById(messageID)).thenReturn(Optional.empty());

        // When
        ResponseEntity<ChatHistory> response = chatHistoryController.getChatHistoryById(messageID);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testDeleteChatHistory() {
        // Given
        Long messageID = 1L;

        // When
        ResponseEntity<Void> response = chatHistoryController.deleteChatHistory(messageID);

        // Then
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(chatHistoryService, times(1)).deleteChatHistory(messageID);
    }

    @Test
    public void testGetChatHistoriesByRentalID() {
        // Given
        Long rentalID = 1L;
        ChatHistory chatHistory1 = new ChatHistory();
        ChatHistory chatHistory2 = new ChatHistory();
        List<ChatHistory> chatHistories = Arrays.asList(chatHistory1, chatHistory2);
        when(chatHistoryService.getChatHistoriesByRentalID(rentalID)).thenReturn(chatHistories);

        // When
        ResponseEntity<List<ChatHistory>> response = chatHistoryController.getChatHistoriesByRentalID(rentalID);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chatHistories, response.getBody());
    }

    @Test
    public void testGetChatHistoriesByUserID() {
        // Given
        Long userID = 1L;
        ChatHistory chatHistory1 = new ChatHistory();
        ChatHistory chatHistory2 = new ChatHistory();
        List<ChatHistory> chatHistories = Arrays.asList(chatHistory1, chatHistory2);
        when(chatHistoryService.getChatHistoriesByUserID(userID)).thenReturn(chatHistories);

        // When
        ResponseEntity<?> response = chatHistoryController.getChatHistoriesByUserID(userID);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chatHistories, response.getBody());
    }

    @Test
    public void testGetChatPartnerIDsByUserID() {
        // Given
        Long userID = 1L;
        List<Long> partnerIDs = Arrays.asList(2L, 3L);
        when(chatHistoryService.getChatPartnerIDsByUserID(userID)).thenReturn(partnerIDs);

        // When
        ResponseEntity<?> response = chatHistoryController.getChatPartnerIDsByUserID(userID);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(partnerIDs, response.getBody());
    }

    @Test
    public void testGetConversationBetweenUsers() {
        // Given
        Long userA = 1L;
        Long userB = 2L;
        ChatHistory chatHistory = new ChatHistory();
        List<ChatHistory> conversation = Arrays.asList(chatHistory);
        when(userRepository.findById(userA)).thenReturn(Optional.of(new User()));
        when(userRepository.findById(userB)).thenReturn(Optional.of(new User()));
        when(chatHistoryService.getConversationBetweenUsers(userA, userB)).thenReturn(conversation);

        // When
        ResponseEntity<?> response = chatHistoryController.getConversationBetweenUsers(userA, userB);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(conversation, response.getBody());
    }

    @Test
    public void testGetConversationBetweenUsersUserANotFound() {
        // Given
        Long userA = 1L;
        Long userB = 2L;
        when(userRepository.findById(userA)).thenReturn(Optional.empty());

        // When
        ResponseEntity<?> response = chatHistoryController.getConversationBetweenUsers(userA, userB);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("User " + userA + " does not exist. Please provide a valid user ID.", response.getBody());
    }

    @Test
    public void testGetConversationBetweenUsersUserBNotFound() {
        // Given
        Long userA = 1L;
        Long userB = 2L;
        when(userRepository.findById(userA)).thenReturn(Optional.of(new User()));
        when(userRepository.findById(userB)).thenReturn(Optional.empty());

        // When
        ResponseEntity<?> response = chatHistoryController.getConversationBetweenUsers(userA, userB);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("User " + userB + " does not exist. Please provide a valid user ID.", response.getBody());
    }

    @Test
    public void testGetConversationBetweenUsersNoMessages() {
        // Given
        Long userA = 1L;
        Long userB = 2L;
        when(userRepository.findById(userA)).thenReturn(Optional.of(new User()));
        when(userRepository.findById(userB)).thenReturn(Optional.of(new User()));
        when(chatHistoryService.getConversationBetweenUsers(userA, userB)).thenReturn(Arrays.asList());

        // When
        ResponseEntity<?> response = chatHistoryController.getConversationBetweenUsers(userA, userB);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("No messages found between user " + userA + " and user " + userB + ".", response.getBody());
    }
}
