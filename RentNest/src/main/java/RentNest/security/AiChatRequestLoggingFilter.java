package RentNest.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 13)
public class AiChatRequestLoggingFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-AI-Chat-Request-Id";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9-]{1,64}");
    private static final Logger log = LoggerFactory.getLogger(AiChatRequestLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/ai-chat/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader(HEADER);
        String id = supplied != null && SAFE_ID.matcher(supplied).matches()
                ? supplied : UUID.randomUUID().toString();
        String previous = MDC.get("aiChatRequestId");
        MDC.put("aiChatRequestId", id);
        response.setHeader(HEADER, id);
        response.setHeader("Cache-Control", "no-store");
        long started = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            if (status >= 400) {
                log.warn("[AIChat] event=request_completed requestId={} status={} durationMs={}",
                        id, status, durationMs);
            } else {
                log.info("[AIChat] event=request_completed requestId={} status={} durationMs={}",
                        id, status, durationMs);
            }
            if (previous == null) MDC.remove("aiChatRequestId");
            else MDC.put("aiChatRequestId", previous);
        }
    }
}
