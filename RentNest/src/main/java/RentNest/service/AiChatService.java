package RentNest.service;

import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.dto.AiChatQuestionResponseDTO;
import RentNest.model.ChatHistory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.GZIPInputStream;

@Service
public class AiChatService {
    private static final String PLACEHOLDER_PREFIX = "[HARDCODED PLACEHOLDER]";
    private static final Duration LLM_CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration LLM_REQUEST_TIMEOUT = Duration.ofSeconds(20);
    private static final List<String> PLACEHOLDER_API_KEYS = List.of(
            "YOUR_LLM_API_KEY",
            "YOUR_GEMINI_API_KEY",
            "YOUR_OPENROUTER_API_KEY"
    );

    private final ChatHistoryService chatHistoryService;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${llm.api-key:}")
    private String llmApiKey;

    @Value("${llm.provider:gemini}")
    private String llmProvider;

    @Value("${llm.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String llmApiUrl;

    @Value("${llm.model:gemini-3.6-flash}")
    private String llmModel;

    public AiChatService(ChatHistoryService chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(LLM_CONNECT_TIMEOUT)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public AiChatSummaryResponseDTO generateChatSummary(Long userA, Long userB) {
        List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

        if (conversation.isEmpty()) {
            return new AiChatSummaryResponseDTO(
                    PLACEHOLDER_PREFIX + " No messages found between these users yet.",
                    true
            );
        }

        if (!isLlmConfigured()) {
            return new AiChatSummaryResponseDTO(generatePlaceholderSummary(conversation), true);
        }

        String systemInstruction = """
                You are the RentNest chat assistant for a rental housing app.
                Summarise rental conversations for users who want quick status updates.

                Rules:
                - Use only facts explicitly stated in the transcript.
                - Do not speculate about who is owner or tenant based on names.
                - Do not comment on funny, odd, duplicated, or confusing names.
                - Keep the summary professional, concise, and useful.
                - Use plain text only. Do not use Markdown, asterisks, hashtags, or bold formatting.
                - Start directly with "Summary:".
                - Always include all four sections below.
                - Keep the full response under 140 words.

                Required output format:
                Summary:
                - One sentence describing the overall discussion.

                Key Details:
                Rent/deposit: mention details, or say Not mentioned.
                Viewing/move-in: mention details, or say Not mentioned.
                Location/amenities: mention details, or say Not mentioned.

                Next Steps:
                - Mention the agreed next step, or say No clear next step mentioned.
                """;

        String prompt = """
                Chat transcript:
                %s
                """.formatted(formatConversation(conversation));

        String summary = callLlm(systemInstruction, prompt);
        return new AiChatSummaryResponseDTO(summary, false);
    }

    public AiChatQuestionResponseDTO askQuestion(Long userA, Long userB, String question) {
        if (question == null || question.trim().isEmpty()) {
            return new AiChatQuestionResponseDTO(
                    false,
                    "empty_question",
                    "Please ask a question about this rental conversation.",
                    false
            );
        }

        String normalizedQuestion = question.toLowerCase(Locale.ROOT);

        if (isSummaryQuestion(normalizedQuestion)) {
            AiChatSummaryResponseDTO summary = generateChatSummary(userA, userB);
            return new AiChatQuestionResponseDTO(
                    true,
                    "chat_summary",
                    summary.getSummary(),
                    summary.isPlaceholder()
            );
        }

        if (isAiHelpQuestion(normalizedQuestion)) {
            return new AiChatQuestionResponseDTO(
                    true,
                    "rental_conversation",
                    generateAllowedQuestionGuide(),
                    false
            );
        }

        if (isOutOfScopeQuestion(normalizedQuestion)) {
            return new AiChatQuestionResponseDTO(
                    false,
                    "out_of_scope",
                    "I can only answer questions related to this rental conversation, such as the listing, rent, viewing plans, tenant/owner requests, or next steps.",
                    false
            );
        }

        List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

        if (conversation.isEmpty()) {
            return new AiChatQuestionResponseDTO(
                    true,
                    "rental_conversation",
                    "There are no messages in this rental conversation yet, so I cannot answer using chat context.",
                    false
            );
        }

        if (!isLlmConfigured()) {
            return new AiChatQuestionResponseDTO(
                    true,
                    "rental_conversation",
                    generatePlaceholderAnswer(conversation),
                    true
            );
        }

        String systemInstruction = """
                You are the RentNest chat assistant for a rental housing app.

                You may only answer questions related to this rental conversation.
                Allowed topics:
                - rental listing
                - rent and deposit
                - viewing plans
                - lease and move-in details
                - owner or tenant requests
                - next steps
                - summary of the chat
                - what rental-chat questions this assistant can answer

                If the user's question is unrelated, reply exactly:
                I can only answer questions related to this rental conversation.

                Rules:
                - Use only facts from the chat transcript.
                - Do not speculate about who is owner or tenant based on names.
                - Do not comment on funny, odd, duplicated, or confusing names.
                - If the chat does not contain the answer, say that the information was not mentioned in the conversation.
                - Keep the answer concise and practical.
                - Use plain text only. Do not use Markdown, asterisks, hashtags, or bold formatting.
                """;

        String prompt = """
                Chat transcript:
                %s

                User question:
                %s
                """.formatted(formatConversation(conversation), question.trim());

        String answer = callLlm(systemInstruction, prompt);

        return new AiChatQuestionResponseDTO(
                true,
                "rental_conversation",
                answer,
                false
        );
    }

    private boolean isLlmConfigured() {
        return llmApiKey != null
                && !llmApiKey.isBlank()
                && !PLACEHOLDER_API_KEYS.contains(llmApiKey)
                && isSupportedProvider(llmProvider)
                && llmApiUrl != null
                && !llmApiUrl.isBlank()
                && llmModel != null
                && !llmModel.isBlank();
    }

    private boolean isSupportedProvider(String provider) {
        return "gemini".equalsIgnoreCase(provider) || "openrouter".equalsIgnoreCase(provider);
    }

    private String generatePlaceholderSummary(List<ChatHistory> conversation) {
        ChatHistory latestMessage = conversation.get(conversation.size() - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "User " + latestMessage.getSenderId();
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage() : "";

        return String.format(
                "%s This chat currently has %d message(s) between the owner and tenant. Latest message from %s: \"%s\". Add your LLM API key in application.properties to enable real LLM summaries.",
                PLACEHOLDER_PREFIX,
                conversation.size(),
                latestSender,
                latestText
        );
    }

    private String generatePlaceholderAnswer(List<ChatHistory> conversation) {
        ChatHistory latestMessage = conversation.get(conversation.size() - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "User " + latestMessage.getSenderId();
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage() : "";

        return String.format(
                "%s This question is within the rental conversation scope. The chat has %d message(s). Latest message from %s: \"%s\". Add your LLM API key in application.properties to enable real LLM answers.",
                PLACEHOLDER_PREFIX,
                conversation.size(),
                latestSender,
                latestText
        );
    }

    private String formatConversation(List<ChatHistory> conversation) {
        StringBuilder transcript = new StringBuilder();
        Long firstSenderId = conversation.get(0).getSenderId();
        for (ChatHistory message : conversation) {
            String sender = message.getSenderName() != null ? message.getSenderName() : "User " + message.getSenderId();
            String text = message.getMessage() != null ? message.getMessage() : "";
            String participant = firstSenderId != null && firstSenderId.equals(message.getSenderId()) ? "Participant A" : "Participant B";
            transcript.append(participant)
                    .append(" (")
                    .append(sender)
                    .append(")")
                    .append(": ")
                    .append(text)
                    .append("\n");
        }
        return transcript.toString();
    }

    private String callLlm(String systemInstruction, String prompt) {
        if ("openrouter".equalsIgnoreCase(llmProvider)) {
            return callOpenRouter(systemInstruction, prompt);
        }

        return callGemini(systemInstruction, prompt);
    }

    private String callOpenRouter(String systemInstruction, String prompt) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", llmModel,
                    "messages", List.of(
                            Map.of(
                                    "role", "system",
                                    "content", systemInstruction
                            ),
                            Map.of(
                                    "role", "user",
                                    "content", prompt
                            )
                    ),
                    "temperature", 0.2,
                    "max_tokens", 768
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(llmApiUrl))
                    .timeout(LLM_REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Accept-Encoding", "identity")
                    .header("Authorization", "Bearer " + llmApiKey)
                    .header("HTTP-Referer", "http://localhost:8080")
                    .header("X-Title", "RentNest")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("OpenRouter API returned status " + response.statusCode());
            }

            JsonNode responseJson = objectMapper.readTree(decodeResponseBody(response));
            JsonNode textNode = responseJson.path("choices").path(0).path("message").path("content");

            if (textNode.isMissingNode() || textNode.asText().isBlank()) {
                throw new RuntimeException("OpenRouter API returned an empty response");
            }

            return textNode.asText().trim();
        } catch (Exception e) {
            throw new RuntimeException("Unable to call OpenRouter API: " + e.getMessage());
        }
    }

    private String decodeResponseBody(HttpResponse<byte[]> response) throws Exception {
        String contentEncoding = response.headers()
                .firstValue("content-encoding")
                .orElse("");

        if ("gzip".equalsIgnoreCase(contentEncoding)) {
            try (GZIPInputStream gzipInputStream = new GZIPInputStream(new ByteArrayInputStream(response.body()))) {
                return new String(gzipInputStream.readAllBytes(), StandardCharsets.UTF_8);
            }
        }

        return new String(response.body(), StandardCharsets.UTF_8);
    }

    private String callGemini(String systemInstruction, String prompt) {
        try {
            String url = String.format(
                    "%s/%s:generateContent",
                    llmApiUrl.replaceAll("/$", ""),
                    llmModel
            );

            Map<String, Object> requestBody = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(
                                    Map.of("text", systemInstruction)
                            )
                    ),
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(
                                            Map.of("text", prompt)
                                    )
                            )
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "maxOutputTokens", 768
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(LLM_REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", llmApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("Gemini API returned status " + response.statusCode());
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            JsonNode textNode = responseJson.path("candidates").path(0).path("content").path("parts").path(0).path("text");

            if (textNode.isMissingNode() || textNode.asText().isBlank()) {
                throw new RuntimeException("Gemini API returned an empty response");
            }

            return textNode.asText().trim();
        } catch (Exception e) {
            throw new RuntimeException("Unable to call Gemini API: " + e.getMessage());
        }
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

    private boolean isSummaryQuestion(String question) {
        return containsAny(
                question,
                "summarize",
                "summarise",
                "summary",
                "recap"
        ) && containsAny(question, "chat", "conversation");
    }

    private boolean isAiHelpQuestion(String question) {
        return containsAny(
                question,
                "what questions can i ask",
                "what can i ask",
                "what should i ask",
                "what are allowed questions",
                "what topics can i ask",
                "how can you help",
                "what can you help with"
        );
    }

    private String generateAllowedQuestionGuide() {
        return """
                You can ask questions about this rental conversation, such as:
                - What is the rent and deposit?
                - When is the viewing?
                - What move-in date was discussed?
                - What amenities or location details were mentioned?
                - What are the next steps?
                - Summarise the chat.
                """.trim();
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
