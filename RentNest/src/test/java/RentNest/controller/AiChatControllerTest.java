package RentNest.controller;

import RentNest.model.User;
import RentNest.service.AiChatProviderException;
import RentNest.service.AiChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiChatControllerTest {
    private AiChatService service;
    private AiChatController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        service = mock(AiChatService.class);
        controller = new AiChatController(service);
        authentication = mock(Authentication.class);
        User user = mock(User.class);
        when(user.getUserID()).thenReturn(1L);
        when(authentication.getPrincipal()).thenReturn(user);
    }

    @ParameterizedTest
    @CsvSource({
            "TIMEOUT,504,ai_timeout",
            "RATE_LIMIT,429,ai_rate_limited",
            "UNAVAILABLE,503,ai_unavailable",
            "INVALID_RESPONSE,503,ai_invalid_response"
    })
    void providerFailuresUseRecoverableHttpStatuses(
            AiChatProviderException.Kind kind,
            int expectedStatus,
            String expectedCode) {
        when(service.generateChatSummary(1L, 2L))
                .thenThrow(new AiChatProviderException(kind, "provider details", false));

        ResponseEntity<?> response = controller.getChatSummary(1L, 2L, authentication);

        assertEquals(expectedStatus, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals(expectedCode, body.get("code"));
        assertEquals(false, body.get("message").contains("provider details"));
    }
}
