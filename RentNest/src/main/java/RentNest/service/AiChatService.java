package RentNest.service;

import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.dto.AiChatQuestionResponseDTO;
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

    public AiChatQuestionResponseDTO askQuestion(Long userA, Long userB, String question) {
        if (question == null || question.trim().isEmpty()) {
            return new AiChatQuestionResponseDTO(
                    false,
                    "empty_question",
                    "[HARDCODED PLACEHOLDER] Please ask a question about this rental conversation.",
                    true
            );
        }

        String normalizedQuestion = question.toLowerCase(Locale.ROOT);

        if (isOutOfScopeQuestion(normalizedQuestion)) {
            return new AiChatQuestionResponseDTO(
                    false,
                    "out_of_scope",
                    "[HARDCODED PLACEHOLDER] I can only answer questions related to this rental conversation, such as the listing, rent, viewing plans, tenant/owner requests, or next steps.",
                    true
            );
        }

        List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

        if (conversation.isEmpty()) {
            return new AiChatQuestionResponseDTO(
                    true,
                    "rental_conversation",
                    "[HARDCODED PLACEHOLDER] There are no messages in this rental conversation yet, so I cannot answer using chat context.",
                    true
            );
        }

        ChatHistory latestMessage = conversation.get(conversation.size() - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "User " + latestMessage.getSenderId();
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage() : "";

        String answer = String.format(
                "[HARDCODED PLACEHOLDER] This question is within the rental conversation scope. The chat has %d message(s). Latest message from %s: \"%s\". Real LLM integration will answer using full chat context later.",
                conversation.size(),
                latestSender,
                latestText
        );

        return new AiChatQuestionResponseDTO(
                true,
                "rental_conversation",
                answer,
                true
        );
    }

    private boolean isOutOfScopeQuestion(String question) {
        return containsAny(
                question,
                "solve",
                "math",
                "calculus",
                "equation",
                "write code",
                "python",
                "java program",
                "javascript",
                "world cup",
                "weather",
                "stock price",
                "tell me a joke",
                "recipe",
                "movie",
                "song",
                "ignore previous"
        ) && !containsAny(question, "rent", "rental", "tenant", "owner", "listing", "lease", "deposit", "viewing", "chat", "conversation");
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
