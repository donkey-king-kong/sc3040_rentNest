package RentNest.controller;

import RentNest.dto.AiChatQuestionRequestDTO;
import RentNest.dto.AiChatQuestionResponseDTO;
import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.model.User;
import RentNest.service.AiChatProviderException;
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

import java.util.Map;

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
        } catch (AiChatProviderException failure) {
            return providerFailure("summary", failure);
        } catch (Exception e) {
            logger.error("AI chat summary request failed unexpectedly for userA={}, userB={}",
                    userA, userB, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorBody("ai_internal_error", "Unable to generate the summary right now."));
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
        } catch (AiChatProviderException failure) {
            return providerFailure("question", failure);
        } catch (Exception e) {
            logger.error("Ask AI request failed for userA={}, userB={}, questionLength={}",
                    request.getUserA(),
                    request.getUserB(),
                    request.getQuestion() == null ? 0 : request.getQuestion().length(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorBody("ai_internal_error", "Unable to answer right now."));
        }
    }

    private ResponseEntity<?> providerFailure(
            String operation,
            AiChatProviderException failure) {
        HttpStatus status = switch (failure.getKind()) {
            case TIMEOUT -> HttpStatus.GATEWAY_TIMEOUT;
            case RATE_LIMIT -> HttpStatus.TOO_MANY_REQUESTS;
            case UNAVAILABLE, INVALID_RESPONSE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        String code = switch (failure.getKind()) {
            case TIMEOUT -> "ai_timeout";
            case RATE_LIMIT -> "ai_rate_limited";
            case UNAVAILABLE -> "ai_unavailable";
            case INVALID_RESPONSE -> "ai_invalid_response";
        };
        String message = switch (failure.getKind()) {
            case TIMEOUT -> "The AI took too long to respond. Please try again.";
            case RATE_LIMIT -> "The AI service is busy. Please wait and try again.";
            case UNAVAILABLE, INVALID_RESPONSE -> "The AI service is temporarily unavailable. Please try again.";
        };
        logger.warn("AI chat provider request failed operation={} kind={} status={}",
                operation, failure.getKind(), status.value());
        return ResponseEntity.status(status).body(errorBody(code, message));
    }

    private Map<String, String> errorBody(String code, String message) {
        return Map.of("code", code, "message", message);
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
