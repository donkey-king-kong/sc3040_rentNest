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

/** Wrap security as well as MVC so rejected requests get a timing and correlation ID. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class InboxRequestLoggingFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Inbox-Request-Id";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9-]{1,64}");
    private static final Logger log = LoggerFactory.getLogger(InboxRequestLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"GET".equals(request.getMethod())
                || !"/api/listings/inbox".equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader(HEADER);
        String id = supplied != null && SAFE_ID.matcher(supplied).matches()
                ? supplied : UUID.randomUUID().toString();
        String previous = MDC.get("inboxRequestId");
        MDC.put("inboxRequestId", id);
        response.setHeader(HEADER, id);
        response.setHeader("Cache-Control", "no-store");
        long start = System.nanoTime();
        boolean failed = false;
        log.info("[Inbox] event=request_started requestId={}", id);
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException exception) {
            failed = true;
            log.error("[Inbox] event=request_failed requestId={} errorType={}",
                    id, exception.getClass().getSimpleName());
            throw exception;
        } finally {
            int status = failed ? 500 : response.getStatus();
            long duration = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
            if (status >= 400) {
                log.warn("[Inbox] event=request_completed requestId={} status={} durationMs={}", id, status, duration);
            } else {
                log.info("[Inbox] event=request_completed requestId={} status={} durationMs={}", id, status, duration);
            }
            if (previous == null) MDC.remove("inboxRequestId");
            else MDC.put("inboxRequestId", previous);
        }
    }
}
