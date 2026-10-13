package RentNest.service;

import RentNest.config.AiChatProperties;
import RentNest.dto.AiChatSummaryResponseDTO;
import RentNest.model.ChatHistory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(OutputCaptureExtension.class)
class AiChatServiceTest {
    private ChatHistoryService chatHistoryService;
    private AiChatProviderClient providerClient;
    private AiChatProperties properties;
    private AiChatService service;
    private List<ChatHistory> messages;

    @BeforeEach
    void setUp() {
        chatHistoryService = mock(ChatHistoryService.class);
        providerClient = mock(AiChatProviderClient.class);
        properties = new AiChatProperties();
        properties.setApiKey("test-key");
        properties.setModel("primary-model");
        properties.setFallbackModel("fallback-model");
        properties.setSummaryCacheTtlMs(60_000);
        messages = new ArrayList<>(List.of(message(1, "private transcript")));
        when(chatHistoryService.getConversationBetweenUsers(anyLong(), anyLong()))
                .thenAnswer(invocation -> messages);
        when(providerClient.complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean()))
                .thenReturn(completion());
        service = new AiChatService(chatHistoryService, properties, providerClient);
    }

    @Test
    void cacheFollowsLatestMessageAndLogsOnlyGeneratedContent(CapturedOutput output) {
        MDC.put("aiChatRequestId", "summary-request-1");
        try {
            AiChatSummaryResponseDTO first = service.generateChatSummary(1L, 2L);
            AiChatSummaryResponseDTO cached = service.generateChatSummary(2L, 1L);
            assertEquals(first.getSummary(), cached.getSummary());
            verify(providerClient, times(1))
                    .complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean());

            messages.add(message(2, "new private message"));
            service.generateChatSummary(1L, 2L);
            verify(providerClient, times(2))
                    .complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean());
            Map<?, ?> cache = (Map<?, ?>) ReflectionTestUtils.getField(service, "summaryCache");
            assertEquals(1, cache.size());
        } finally {
            MDC.remove("aiChatRequestId");
        }

        String logs = output.getOut();
        assertTrue(logs.contains("requestId=summary-request-1"));
        assertTrue(logs.contains("model=primary-model"));
        assertTrue(logs.contains("status=200"));
        assertTrue(logs.contains("messageCount=1"));
        assertTrue(logs.contains("durationMs="));
        assertTrue(logs.contains("summary=" + validSummary()));
        assertFalse(logs.contains("private transcript"));
        assertFalse(logs.contains("new private message"));
    }

    @Test
    void oversizedConversationIsChunkedAndAggregatedWithoutDroppingMessages() {
        properties.setSummaryChunkMessageLimit(2);
        properties.setSummaryChunkCharacterLimit(10_000);
        messages.add(message(2, "second"));
        messages.add(message(3, "third"));

        service.generateChatSummary(1L, 2L);

        verify(providerClient, times(3))
                .complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void malformedSummaryIsRejectedAndNeverCached() {
        when(providerClient.complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean()))
                .thenReturn(new AiChatProviderClient.Completion("not-json", "primary-model", 200, 12));

        AiChatProviderException failure = assertThrows(
                AiChatProviderException.class,
                () -> service.generateChatSummary(1L, 2L));
        assertEquals(AiChatProviderException.Kind.INVALID_RESPONSE, failure.getKind());

        assertThrows(AiChatProviderException.class, () -> service.generateChatSummary(1L, 2L));
        verify(providerClient, times(2))
                .complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void concurrentRequestsShareOneProviderCall() throws Exception {
        CountDownLatch providerStarted = new CountDownLatch(1);
        CountDownLatch releaseProvider = new CountDownLatch(1);
        CountDownLatch conversationsFetched = new CountDownLatch(2);
        when(chatHistoryService.getConversationBetweenUsers(anyLong(), anyLong()))
                .thenAnswer(invocation -> {
                    conversationsFetched.countDown();
                    return messages;
                });
        when(providerClient.complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean()))
                .thenAnswer(invocation -> {
                    providerStarted.countDown();
                    assertTrue(releaseProvider.await(2, TimeUnit.SECONDS));
                    return completion();
                });
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.generateChatSummary(1L, 2L));
            assertTrue(providerStarted.await(2, TimeUnit.SECONDS));
            var second = executor.submit(() -> service.generateChatSummary(2L, 1L));
            assertTrue(conversationsFetched.await(2, TimeUnit.SECONDS));
            releaseProvider.countDown();
            assertEquals(validSummary(), first.get(2, TimeUnit.SECONDS).getSummary());
            assertEquals(validSummary(), second.get(2, TimeUnit.SECONDS).getSummary());
        } finally {
            executor.shutdownNow();
        }
        verify(providerClient, times(1))
                .complete(anyString(), anyString(), anyString(), anyInt(), anyBoolean());
    }

    private ChatHistory message(long id, String text) {
        ChatHistory message = new ChatHistory();
        message.setMessageID(id);
        message.setMessage(text);
        message.setDate(new Date(id));
        return message;
    }

    private AiChatProviderClient.Completion completion() {
        return new AiChatProviderClient.Completion(validSummary(), "primary-model", 200, 12);
    }

    private String validSummary() {
        return "{\"overview\":\"Overview\",\"next_steps\":\"Next\",\"sections\":[]}";
    }
}
