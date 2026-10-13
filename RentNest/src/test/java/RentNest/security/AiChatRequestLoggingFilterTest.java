package RentNest.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(OutputCaptureExtension.class)
class AiChatRequestLoggingFilterTest {
    @Test
    void invalidCorrelationIdIsReplacedAndNotLogged(CapturedOutput output) throws Exception {
        AiChatRequestLoggingFilter filter = new AiChatRequestLoggingFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/ai-chat/summary");
        request.setServletPath("/api/ai-chat/summary");
        request.addHeader(AiChatRequestLoggingFilter.HEADER, "unsafe_value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (ignoredRequest, filteredResponse) ->
                ((MockHttpServletResponse) filteredResponse).setStatus(200));

        String requestId = response.getHeader(AiChatRequestLoggingFilter.HEADER);
        assertNotNull(requestId);
        assertNotEquals("unsafe_value", requestId);
        assertTrue(output.getOut().contains("[AIChat] event=request_completed"));
        assertFalse(output.getOut().contains("unsafe_value"));
    }
}
