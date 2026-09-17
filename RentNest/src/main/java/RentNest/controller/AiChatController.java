package RentNest.controller;

import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.dto.AiSafetyCheckRequestDTO;
import RentNest.dto.AiSafetyCheckResponseDTO;
import RentNest.service.AiChatService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-chat")
public class AiChatController {
    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getChatSummary(@RequestParam("userA") Long userA, @RequestParam("userB") Long userB) {
        try {
            AiChatSummaryResponseDTO summary = aiChatService.generateChatSummary(userA, userB);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while generating the chat summary: " + e.getMessage());
        }
    }

    @PostMapping("/safety-check")
    public ResponseEntity<?> checkMessageSafety(@RequestBody AiSafetyCheckRequestDTO request) {
        try {
            AiSafetyCheckResponseDTO result = aiChatService.checkMessageSafety(request.getMessage());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while checking message safety: " + e.getMessage());
        }
    }
}
