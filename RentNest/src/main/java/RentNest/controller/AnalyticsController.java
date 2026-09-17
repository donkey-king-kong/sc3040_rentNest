package RentNest.controller;

import RentNest.dto.analytics.AnalyticsPeriod;
import RentNest.dto.analytics.AnalyticsResponse;
import RentNest.model.User;
import RentNest.service.AnalyticsException;
import RentNest.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Analytics endpoints. The owner/actor is always the authenticated user;
 * client-supplied user or owner IDs are never read.
 *
 * Period parameters are ISO-8601 date-times with an offset, applied as [from, to).
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // GET /api/analytics/owner/summary?from=2026-01-01T00:00:00+08:00&to=2026-04-01T00:00:00+08:00
    @GetMapping("/owner/summary")
    public ResponseEntity<AnalyticsResponse> ownerSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        AnalyticsPeriod period = analyticsService.parsePeriod(from, to);
        return ResponseEntity.ok(analyticsService.ownerSummary(user, period));
    }

    // GET /api/analytics/owner/listings/{listingId}?from=...&to=...
    @GetMapping("/owner/listings/{listingId}")
    public ResponseEntity<AnalyticsResponse> listingAnalytics(
            @AuthenticationPrincipal User user,
            @PathVariable Long listingId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        AnalyticsPeriod period = analyticsService.parsePeriod(from, to);
        return ResponseEntity.ok(analyticsService.listingAnalytics(user, listingId, period));
    }

    // GET /api/analytics/admin/summary?from=...&to=...  (admin accounts only)
    @GetMapping("/admin/summary")
    public ResponseEntity<AnalyticsResponse> platformSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        AnalyticsPeriod period = analyticsService.parsePeriod(from, to);
        return ResponseEntity.ok(analyticsService.platformSummary(user, period));
    }

    @ExceptionHandler(AnalyticsException.class)
    public ResponseEntity<Map<String, String>> handleAnalyticsException(AnalyticsException e) {
        return ResponseEntity.status(e.getStatus())
                .body(Map.of("error", e.getCode(), "message", e.getMessage()));
    }
}
