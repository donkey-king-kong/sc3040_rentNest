package RentNest.controller;

import RentNest.dto.AiChatQuestionRequestDTO;
import RentNest.dto.AiChatQuestionResponseDTO;
import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.model.User;
import RentNest.service.AiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-chat")
public class AiChatController {
    private static final Logger logger = LoggerFactory.getLogger(AiChatController.class);

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getChatSummary(@RequestParam("userA") Long userA, @RequestParam("userB") Long userB, Authentication authentication) {
        try {
            if (!isAuthenticatedConversationParticipant(userA, userB, authentication)) {
                logger.warn("AI chat summary access denied for userA={}, userB={}, authenticatedUser={}",
                        userA,
                        userB,
                        getAuthenticatedUserId(authentication));
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not allowed to access this conversation.");
            }

            AiChatSummaryResponseDTO summary = aiChatService.generateChatSummary(userA, userB);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            logger.error("AI chat summary request failed for userA={}, userB={}", userA, userB, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while generating the chat summary: " + e.getMessage());
        }
    }

    @PostMapping("/ask")
    public ResponseEntity<?> askQuestion(@RequestBody AiChatQuestionRequestDTO request, Authentication authentication) {
        try {
            if (!isAuthenticatedConversationParticipant(request.getUserA(), request.getUserB(), authentication)) {
                logger.warn("Ask AI access denied for userA={}, userB={}, authenticatedUser={}",
                        request.getUserA(),
                        request.getUserB(),
                        getAuthenticatedUserId(authentication));
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not allowed to access this conversation.");
            }

            AiChatQuestionResponseDTO result = aiChatService.askQuestion(
                    request.getUserA(),
                    request.getUserB(),
                    request.getQuestion()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Ask AI request failed for userA={}, userB={}, questionLength={}",
                    request.getUserA(),
                    request.getUserB(),
                    request.getQuestion() == null ? 0 : request.getQuestion().length(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while answering the AI chat question: " + e.getMessage());
        }
    }

    private boolean isAuthenticatedConversationParticipant(Long userA, Long userB, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User authenticatedUser)) {
            return false;
        }

        Long authenticatedUserId = authenticatedUser.getUserID();
        return authenticatedUserId != null && (authenticatedUserId.equals(userA) || authenticatedUserId.equals(userB));
    }

    private Long getAuthenticatedUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User authenticatedUser)) {
            return null;
        }

        return authenticatedUser.getUserID();
    }
}
