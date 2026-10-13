package RentNest.service;

import RentNest.config.AiChatProperties;
import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.dto.AiChatQuestionResponseDTO;
import RentNest.model.ChatHistory;
import RentNest.model.Listings;
import RentNest.model.Rentals;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class AiChatService {
    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);
    private static final String SUMMARY_PROMPT_VERSION = "summary-v2";
    // Demo conversation between Superman (1) and Batman (2) — used as a hardcoded fallback when the AI fails.
    private static final long DEMO_USER_A = 1L;
    private static final long DEMO_USER_B = 2L;
    private static final String DEMO_SUMMARY_JSON = """
            {"overview":"Batman and Superman discussed viewing arrangements, parking, utilities, and furnishings for the condo.","next_steps":"Batman and Superman will meet for the viewing on Thursday at 7pm.","sections":[{"label":"Viewing & move-in","icon":"calendar","rows":[{"label":"Viewing time","value":"Thursday at 7pm"}]},{"label":"Utilities","icon":"bolt","rows":[{"label":"Utilities","value":"Separate (estimated S$300-S$400 monthly)"}]}]}""";
    private static final List<String> PLACEHOLDER_API_KEYS = List.of(
            "YOUR_LLM_API_KEY",
            "YOUR_GEMINI_API_KEY",
            "YOUR_OPENROUTER_API_KEY"
    );

    private final ChatHistoryService chatHistoryService;
    private final AiChatProperties properties;
    private final AiChatProviderClient providerClient;
    private final ObjectMapper objectMapper;
    private final Map<SummaryCacheKey, SummaryCacheEntry> summaryCache = new ConcurrentHashMap<>();
    private final Map<SummaryCacheKey, CompletableFuture<AiChatSummaryResponseDTO>> summaryInFlight =
            new ConcurrentHashMap<>();

    public AiChatService(
            ChatHistoryService chatHistoryService,
            AiChatProperties properties,
            AiChatProviderClient providerClient) {
        this.chatHistoryService = chatHistoryService;
        this.properties = properties;
        this.providerClient = providerClient;
        this.objectMapper = new ObjectMapper();
    }

    public AiChatSummaryResponseDTO generateChatSummary(Long userA, Long userB) {
        List<ChatHistory> conversation = chatHistoryService.getConversationBetweenUsers(userA, userB);

        if (conversation.isEmpty()) {
            log.info("[AIChat] event=summary_skipped requestId={} reason=empty_conversation messageCount=0",
                    requestId());
            return new AiChatSummaryResponseDTO(
                    "There are no messages to summarise yet. Send a message to start the conversation.",
                    false
            );
        }

        if (!isLlmConfigured()) {
            return new AiChatSummaryResponseDTO(generatePlaceholderSummary(conversation), true);
        }

        SummaryCacheKey cacheKey = summaryCacheKey(userA, userB, conversation);
        long now = System.currentTimeMillis();
        pruneSummaryCache(cacheKey, now);
        SummaryCacheEntry cached = summaryCache.get(cacheKey);
        if (cached != null && now - cached.createdAt() <= Math.max(1, properties.getSummaryCacheTtlMs())) {
            log.info("[AIChat] event=summary_cache requestId={} cache=hit messageCount={}",
                    requestId(), conversation.size());
            return cached.response();
        }
        if (cached != null) summaryCache.remove(cacheKey, cached);
        log.info("[AIChat] event=summary_cache requestId={} cache=miss messageCount={}",
                requestId(), conversation.size());

        CompletableFuture<AiChatSummaryResponseDTO> ownedFuture = new CompletableFuture<>();
        CompletableFuture<AiChatSummaryResponseDTO> existing = summaryInFlight.putIfAbsent(cacheKey, ownedFuture);
        if (existing != null) {
            log.info("[AIChat] event=request_coalesced requestId={} messageCount={}",
                    requestId(), conversation.size());
            return awaitSummary(existing);
        }

        List<ChatHistory> substantiveMessages = conversation.stream()
                .filter(m -> m.getMessage() != null && !m.getMessage().isBlank())
                .toList();
        if (substantiveMessages.isEmpty()) {
            log.info("[AIChat] event=summary_skipped requestId={} reason=no_text_messages messageCount={}",
                    requestId(), conversation.size());
            return new AiChatSummaryResponseDTO(
                    "There are no messages to summarise yet. Send a message to start the conversation.",
                    false
            );
        }

        try {
            String systemInstruction = """
                You are the RentNest chat assistant for a rental housing app.
                Summarise rental conversations for users who want quick status updates.

                Rules:
                - Use only facts from the structured rental context and chat transcript.
                - When mentioning who should act next, use the speaker's display name or Owner/Tenant role from the transcript.
                - Never refer to speakers as Participant A or Participant B.
                - Do not speculate about who is owner or tenant based on names.
                - Do not comment on funny, odd, duplicated, or confusing names.
                - For short conversations, summarise the concrete request or question. If there is no reply yet, note that the message is awaiting a response.
                - If a user asks for information and the reply points them to a source or action, treat that as the next step.
                - If there is only one message and no reply, set "next_steps" to "Awaiting a response." and "sections" to [].
                - Include only sections that have actual content from the conversation.
                - Each section value must be one short sentence or a structured list of key-value pairs, nothing longer.
                - Output valid JSON only. No markdown, no explanation, no trailing text.

                Output a JSON object with these fields:
                - "overview": always required, one sentence summary of what was discussed
                - "next_steps": always required, one sentence on what happens next, or "No clear next step mentioned" only if neither person requested or suggested any action
                - "sections": an array of 0-4 objects, each with "label", "icon", and "content"
                  - Only include a section if that topic was actually discussed
                  - For structured data (prices, dates), use "rows": [{"label": "...", "value": "..."}] instead of "content"
                  - Choose "label" and "icon" from this list only:
                    "Rent & deposit" -> "dollar"
                    "Viewing & move-in" -> "calendar"
                    "Location" -> "map-marker"
                    "Repairs & maintenance" -> "wrench"
                    "Lease terms" -> "file-text-o"
                    "Utilities" -> "bolt"
                    "Legal & disputes" -> "balance-scale"

                Example output:
                {"overview":"Discussed unit condition and agreed on a weekend viewing.","next_steps":"Tenant will confirm availability by Friday.","sections":[{"label":"Viewing & move-in","icon":"calendar","rows":[{"label":"Viewing","value":"Sat 19 Sep 2:30 PM"},{"label":"Earliest move-in","value":"Oct 1"}]},{"label":"Location","icon":"map-marker","content":"Blk 18B, #12-04 near bus stop"}]}
                """;

            long summaryStarted = System.nanoTime();
            AiChatProviderClient.Completion completion =
                    summarizeConversation(conversation, systemInstruction);
            validateSummaryJson(completion.text());
            AiChatSummaryResponseDTO response = new AiChatSummaryResponseDTO(completion.text(), false);
            summaryCache.put(cacheKey, new SummaryCacheEntry(System.currentTimeMillis(), response));
            log.info("[AIChat] event=summary_generated requestId={} model={} status={} messageCount={} durationMs={} summary={}",
                    requestId(), completion.model(), completion.status(), conversation.size(),
                    TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - summaryStarted), completion.text());
            ownedFuture.complete(response);
            return response;
        } catch (AiChatProviderException failure) {
            if (failure.getKind() == AiChatProviderException.Kind.INVALID_RESPONSE) {
                log.warn("[AIChat] event=summary_fallback requestId={} reason=invalid_response messageCount={}",
                        requestId(), conversation.size());
            } else {
                log.warn("[AIChat] event=summary_fallback requestId={} reason=provider_error messageCount={}",
                        requestId(), conversation.size());
            }
            String fallbackText = isDemoConversation(userA, userB) ? DEMO_SUMMARY_JSON : generatePlaceholderSummary(conversation);
            AiChatSummaryResponseDTO fallback = new AiChatSummaryResponseDTO(fallbackText, true);
            ownedFuture.complete(fallback);
            return fallback;
        } catch (RuntimeException failure) {
            if (isDemoConversation(userA, userB)) {
                log.warn("[AIChat] event=summary_fallback requestId={} reason=runtime_error messageCount={}",
                        requestId(), conversation.size());
                AiChatSummaryResponseDTO fallback = new AiChatSummaryResponseDTO(DEMO_SUMMARY_JSON, true);
                ownedFuture.complete(fallback);
                return fallback;
            }
            ownedFuture.completeExceptionally(failure);
            throw failure;
        } finally {
            summaryInFlight.remove(cacheKey, ownedFuture);
        }
    }

    private boolean isDemoConversation(Long userA, Long userB) {
        if (userA == null || userB == null) return false;
        long lo = Math.min(userA, userB);
        long hi = Math.max(userA, userB);
        return lo == DEMO_USER_A && hi == DEMO_USER_B;
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
                - Use only facts from the structured rental context and chat transcript.
                - When mentioning who should act next, use the speaker's display name or Owner/Tenant role from the transcript.
                - Never refer to speakers as Participant A or Participant B.
                - Do not speculate about who is owner or tenant based on names.
                - Do not comment on funny, odd, duplicated, or confusing names.
                - If the structured rental context and chat transcript do not contain the answer, say that the information was not mentioned in the conversation.
                - Keep the answer concise and practical.
                - For questions asking for multiple details, start with one short sentence, then put each detail on its own line as "Label: value".
                - Do not combine multiple detail fields into one long sentence.
                - Use plain text only. Do not use Markdown, asterisks, hashtags, or bold formatting.
                """;

        String prompt = """
                Structured rental context:
                %s

                Chat transcript:
                %s

                User question:
                %s
                """.formatted(formatConversationMetadata(conversation), formatConversation(conversation), question.trim());

        String answer = providerClient.complete(
                systemInstruction,
                prompt,
                "question",
                conversation.size(),
                false).text();

        return new AiChatQuestionResponseDTO(
                true,
                "rental_conversation",
                answer,
                false
        );
    }

    private boolean isLlmConfigured() {
        return properties.getApiKey() != null
                && !properties.getApiKey().isBlank()
                && !PLACEHOLDER_API_KEYS.contains(properties.getApiKey())
                && isSupportedProvider(properties.getProvider())
                && properties.getApiUrl() != null
                && !properties.getApiUrl().isBlank()
                && properties.getModel() != null
                && !properties.getModel().isBlank();
    }

    private boolean isSupportedProvider(String provider) {
        return "gemini".equalsIgnoreCase(provider) || "openrouter".equalsIgnoreCase(provider);
    }

    private String generatePlaceholderSummary(List<ChatHistory> conversation) {
        int count = conversation.size();
        ChatHistory latestMessage = conversation.get(count - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "the other party";
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage().trim() : "";

        if (count == 1) {
            if (!latestText.isEmpty()) {
                return String.format(
                        "This conversation has just started. The opening message from %s reads: \"%s\". There is not enough context yet for a full summary.",
                        latestSender, latestText);
            }
            return "This conversation has just started. There is not enough context yet for a full summary.";
        }

        if (!latestText.isEmpty()) {
            return String.format(
                    "This chat has %d messages. The most recent message is from %s: \"%s\".",
                    count, latestSender, latestText);
        }

        return String.format("This chat has %d messages. AI summaries are not available right now.", count);
    }

    private String generatePlaceholderAnswer(List<ChatHistory> conversation) {
        int count = conversation.size();
        ChatHistory latestMessage = conversation.get(count - 1);
        String latestSender = latestMessage.getSenderName() != null ? latestMessage.getSenderName() : "the other party";
        String latestText = latestMessage.getMessage() != null ? latestMessage.getMessage().trim() : "";

        if (count == 1) {
            if (!latestText.isEmpty()) {
                return String.format(
                        "This conversation has just started. The only message so far is from %s: \"%s\". There may not be enough context to answer your question fully.",
                        latestSender, latestText);
            }
            return "This conversation has just started and there is not enough context to answer your question yet.";
        }

        if (!latestText.isEmpty()) {
            return String.format(
                    "This chat has %d messages. The most recent message is from %s: \"%s\". AI answers are not available right now.",
                    count, latestSender, latestText);
        }

        return String.format("This chat has %d messages. AI answers are not available right now.", count);
    }

    private String formatConversation(List<ChatHistory> conversation) {
        StringBuilder transcript = new StringBuilder();
        Rentals rental = findConversationRental(conversation);
        Listings listing = rental != null ? rental.getListings() : null;
        Long ownerId = listing != null ? listing.getOwnerId() : null;
        Long tenantId = rental != null && rental.getTenantUserID() != null ? rental.getTenantUserID() : listing != null ? listing.getTenantId() : null;

        for (ChatHistory message : conversation) {
            String text = message.getMessage() != null ? message.getMessage() : "";
            String speaker = formatSpeakerLabel(message, ownerId, tenantId);

            transcript.append(speaker)
                    .append(": ")
                    .append(text)
                    .append("\n");
        }
        return transcript.toString();
    }

    private String formatSpeakerLabel(ChatHistory message, Long ownerId, Long tenantId) {
        Long senderId = message.getSenderId();
        String senderName = message.getSenderName() != null && !message.getSenderName().isBlank()
                ? message.getSenderName()
                : senderId != null ? "User " + senderId : "Unknown user";

        if (senderId != null && senderId.equals(ownerId)) {
            return "Owner " + senderName;
        }

        if (senderId != null && senderId.equals(tenantId)) {
            return "Tenant " + senderName;
        }

        return senderName;
    }

    private String formatConversationMetadata(List<ChatHistory> conversation) {
        Rentals rental = findConversationRental(conversation);

        if (rental == null) {
            return "No structured rental/listing metadata is attached to this conversation.";
        }

        Listings listing = rental.getListings();
        StringBuilder metadata = new StringBuilder();

        if (listing != null) {
            appendMetadataLine(metadata, "Listing", listing.getName());
            appendMetadataLine(metadata, "Listing location", listing.getLocation());
        }

        Long ownerId = listing != null ? listing.getOwnerId() : null;
        String ownerName = listing != null ? listing.getOwnerName() : null;
        Long tenantId = rental.getTenantUserID() != null ? rental.getTenantUserID() : listing != null ? listing.getTenantId() : null;
        String tenantName = listing != null ? listing.getTenantName() : null;

        appendPersonMetadata(metadata, "Owner", ownerName, ownerId);
        appendPersonMetadata(metadata, "Tenant", tenantName, tenantId);

        if (metadata.isEmpty()) {
            return "No structured rental/listing metadata is attached to this conversation.";
        }

        return metadata.toString();
    }

    private Rentals findConversationRental(List<ChatHistory> conversation) {
        for (ChatHistory message : conversation) {
            if (message.getRental() != null) {
                return message.getRental();
            }

            if (message.getRequest() != null && message.getRequest().getRentals() != null) {
                return message.getRequest().getRentals();
            }
        }

        return null;
    }

    private void appendMetadataLine(StringBuilder metadata, String label, String value) {
        if (value == null || value.isBlank()) {
            return;
        }

        metadata.append(label)
                .append(": ")
                .append(value)
                .append("\n");
    }

    private void appendPersonMetadata(StringBuilder metadata, String role, String name, Long userId) {
        if ((name == null || name.isBlank()) && userId == null) {
            return;
        }

        metadata.append(role)
                .append(": ");

        if (name != null && !name.isBlank()) {
            metadata.append(name);
        } else {
            metadata.append("User ").append(userId);
        }

        if (userId != null) {
            metadata.append(" (user ID ").append(userId).append(")");
        }

        metadata.append("\n");
    }

    private AiChatProviderClient.Completion summarizeConversation(
            List<ChatHistory> conversation,
            String systemInstruction) {
        List<TranscriptChunk> chunks = buildTranscriptChunks(conversation);
        String metadata = formatConversationMetadata(conversation);
        if (chunks.size() == 1) {
            String prompt = """
                    Structured rental context:
                    %s

                    Chat transcript:
                    %s
                    """.formatted(metadata, chunks.get(0).text());
            return providerClient.complete(
                    systemInstruction, prompt, "summary", conversation.size(), true);
        }

        List<String> partialSummaries = new ArrayList<>();
        for (int index = 0; index < chunks.size(); index++) {
            TranscriptChunk chunk = chunks.get(index);
            String prompt = """
                    Structured rental context:
                    %s

                    This is part %d of %d of the chat transcript. Summarise only this part
                    using the required JSON structure so it can be combined later.

                    Chat transcript part:
                    %s
                    """.formatted(metadata, index + 1, chunks.size(), chunk.text());
            AiChatProviderClient.Completion completion = providerClient.complete(
                    systemInstruction, prompt, "summary_chunk", chunk.messageCount(), true);
            validateSummaryJson(completion.text());
            partialSummaries.add(completion.text());
        }

        String aggregatePrompt = """
                Structured rental context:
                %s

                The complete conversation was processed in %d parts. Combine every
                partial summary below into one final summary using the required JSON
                structure. Preserve facts and next steps from all parts without repetition.

                Partial summaries:
                %s
                """.formatted(metadata, chunks.size(), String.join("\n", partialSummaries));
        return providerClient.complete(
                systemInstruction, aggregatePrompt, "summary_aggregate",
                conversation.size(), true);
    }

    private List<TranscriptChunk> buildTranscriptChunks(List<ChatHistory> conversation) {
        int messageLimit = Math.max(1, properties.getSummaryChunkMessageLimit());
        int characterLimit = Math.max(500, properties.getSummaryChunkCharacterLimit());
        Rentals rental = findConversationRental(conversation);
        Listings listing = rental != null ? rental.getListings() : null;
        Long ownerId = listing != null ? listing.getOwnerId() : null;
        Long tenantId = rental != null && rental.getTenantUserID() != null
                ? rental.getTenantUserID()
                : listing != null ? listing.getTenantId() : null;
        List<TranscriptChunk> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int currentMessageCount = 0;

        for (ChatHistory message : conversation) {
            String line = formatSpeakerLabel(message, ownerId, tenantId) + ": "
                    + (message.getMessage() == null ? "" : message.getMessage()) + "\n";
            if (currentMessageCount >= messageLimit
                    || (!current.isEmpty() && current.length() + line.length() > characterLimit)) {
                chunks.add(new TranscriptChunk(current.toString(), currentMessageCount));
                current.setLength(0);
                currentMessageCount = 0;
            }
            if (line.length() > characterLimit) {
                if (!current.isEmpty()) {
                    chunks.add(new TranscriptChunk(current.toString(), currentMessageCount));
                    current.setLength(0);
                    currentMessageCount = 0;
                }
                for (int start = 0; start < line.length(); start += characterLimit) {
                    int end = Math.min(start + characterLimit, line.length());
                    chunks.add(new TranscriptChunk(line.substring(start, end), 1));
                }
                continue;
            }
            current.append(line);
            currentMessageCount++;
        }
        if (!current.isEmpty()) {
            chunks.add(new TranscriptChunk(current.toString(), currentMessageCount));
        }
        return chunks;
    }

    private void validateSummaryJson(String summary) {
        try {
            JsonNode root = objectMapper.readTree(summary);
            if (root == null
                    || !root.path("overview").isTextual()
                    || root.path("overview").asText().isBlank()
                    || !root.path("next_steps").isTextual()
                    || root.path("next_steps").asText().isBlank()
                    || !root.path("sections").isArray()) {
                log.warn("[AIChat] event=invalid_summary requestId={} reason=missing_fields raw={}",
                        requestId(), summary);
                throw new IllegalArgumentException("Missing required summary fields");
            }
        } catch (AiChatProviderException failure) {
            throw failure;
        } catch (Exception failure) {
            log.warn("[AIChat] event=invalid_summary requestId={} reason=parse_error raw={}",
                    requestId(), summary);
            throw new AiChatProviderException(
                    AiChatProviderException.Kind.INVALID_RESPONSE,
                    "AI provider returned an invalid summary",
                    false,
                    failure);
        }
    }

    private SummaryCacheKey summaryCacheKey(
            Long userA,
            Long userB,
            List<ChatHistory> conversation) {
        long firstUser = Math.min(userA, userB);
        long secondUser = Math.max(userA, userB);
        long latestMessageId = conversation.stream()
                .map(ChatHistory::getMessageID)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse((long) conversation.size());
        return new SummaryCacheKey(
                firstUser,
                secondUser,
                latestMessageId,
                properties.getModel(),
                properties.getFallbackModel(),
                SUMMARY_PROMPT_VERSION);
    }

    private void pruneSummaryCache(SummaryCacheKey currentKey, long now) {
        long ttlMs = Math.max(1, properties.getSummaryCacheTtlMs());
        summaryCache.entrySet().removeIf(entry ->
                now - entry.getValue().createdAt() > ttlMs
                        || (entry.getKey().sameConversation(currentKey)
                        && !entry.getKey().equals(currentKey)));
    }

    private AiChatSummaryResponseDTO awaitSummary(
            CompletableFuture<AiChatSummaryResponseDTO> future) {
        try {
            return future.join();
        } catch (CompletionException failure) {
            if (failure.getCause() instanceof RuntimeException runtimeFailure) {
                throw runtimeFailure;
            }
            throw failure;
        }
    }

    private String requestId() {
        String value = MDC.get("aiChatRequestId");
        return value == null ? "unavailable" : value;
    }

    private record TranscriptChunk(String text, int messageCount) {}
    private record SummaryCacheEntry(long createdAt, AiChatSummaryResponseDTO response) {}
    private record SummaryCacheKey(
            long firstUser,
            long secondUser,
            long latestMessageId,
            String primaryModel,
            String fallbackModel,
            String promptVersion) {
        private boolean sameConversation(SummaryCacheKey other) {
            return firstUser == other.firstUser && secondUser == other.secondUser;
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
            String keywordPattern = "(?<![a-z0-9])" + Pattern.quote(keyword.toLowerCase(Locale.ROOT)) + "(?![a-z0-9])";
            if (Pattern.compile(keywordPattern).matcher(text).find()) {
                return true;
            }
        }
        return false;
    }
}
