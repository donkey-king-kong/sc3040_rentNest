package RentNest.service;

import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.dto.AiSafetyCheckResponseDTO;
import RentNest.model.ChatHistory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class AiChatService {
    private static final String PLACEHOLDER_PREFIX = "[HARDCODED PLACEHOLDER]";

    private final ChatHistoryService chatHistoryService;

    public AiChatService(ChatHistoryService chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
    }

    public AiChatSummaryResponseDTO generateChatSummary(Long userA, Long userB) {
        List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

        if (conversation.isEmpty()) {
            return new AiChatSummaryResponseDTO(
                    PLACEHOLDER_PREFIX + " No messages found between these users yet.",
                    true
            );
        }

        ChatHistory latestMessage = conversation.get(conversation.size() - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "User " + latestMessage.getSenderId();
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage() : "";

        String summary = String.format(
                "%s This chat currently has %d message(s) between the owner and tenant. Latest message from %s: \"%s\". Real LLM integration will replace this placeholder summary later.",
                PLACEHOLDER_PREFIX,
                conversation.size(),
                latestSender,
                latestText
        );

        return new AiChatSummaryResponseDTO(summary, true);
    }

    public AiSafetyCheckResponseDTO checkMessageSafety(String message) {
        if (message == null || message.trim().isEmpty()) {
            return new AiSafetyCheckResponseDTO(
                    false,
                    "empty_message",
                    "[HARDCODED PLACEHOLDER] Message cannot be empty.",
                    true
            );
        }

        String normalizedMessage = message.toLowerCase(Locale.ROOT);

        if (containsAny(normalizedMessage, "deposit before viewing", "transfer deposit", "paynow me", "wire transfer", "bank transfer first")) {
            return new AiSafetyCheckResponseDTO(
                    false,
                    "possible_scam",
                    "[HARDCODED PLACEHOLDER] This message may be risky because it appears to request payment before proper verification or viewing.",
                    true
            );
        }

        if (containsAny(normalizedMessage, "password", "otp", "one-time password", "credit card number", "bank account password")) {
            return new AiSafetyCheckResponseDTO(
                    false,
                    "sensitive_information",
                    "[HARDCODED PLACEHOLDER] This message may request sensitive personal or financial information.",
                    true
            );
        }

        if (containsAny(normalizedMessage, "idiot", "stupid", "shut up", "hate you")) {
            return new AiSafetyCheckResponseDTO(
                    false,
                    "harassment",
                    "[HARDCODED PLACEHOLDER] This message may contain disrespectful or harassing language.",
                    true
            );
        }

        return new AiSafetyCheckResponseDTO(
                true,
                "safe",
                "[HARDCODED PLACEHOLDER] No obvious safety issue detected by the placeholder rules.",
                true
        );
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
