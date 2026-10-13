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
@Order(Ordered.HIGHEST_PRECEDENCE + 11)
public class RentalDetailLoggingFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Rental-Request-Id";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9-]{1,64}");
    private static final Pattern ROUTE = Pattern.compile(
            "/api/owner/(listings/[^/]+/(rental-info|tenants/[^/]+)|rentals/[^/]+/payments)");
    private static final Logger log = LoggerFactory.getLogger(RentalDetailLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"GET".equals(request.getMethod()) || !ROUTE.matcher(request.getServletPath()).matches();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String supplied = request.getHeader(HEADER);
        String id = supplied != null && SAFE_ID.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
        String previous = MDC.get("rentalRequestId");
        MDC.put("rentalRequestId", id);
        response.setHeader(HEADER, id);
        response.setHeader("Cache-Control", "no-store");
        long start = System.nanoTime();
        boolean failed = false;
        log.info("[RentalDetail] event=request_started requestId={}", id);
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException error) {
            failed = true;
            log.error("[RentalDetail] event=request_failed requestId={} errorType={}", id, error.getClass().getSimpleName());
            throw error;
        } finally {
            int status = failed ? 500 : response.getStatus();
            long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
            if (status >= 400) log.warn("[RentalDetail] event=request_completed requestId={} status={} durationMs={}", id, status, elapsed);
            else log.info("[RentalDetail] event=request_completed requestId={} status={} durationMs={}", id, status, elapsed);
            if (previous == null) MDC.remove("rentalRequestId");
            else MDC.put("rentalRequestId", previous);
        }
    }
}
