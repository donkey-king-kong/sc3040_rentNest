package RentNest.controller;

import RentNest.dto.analytics.AnalyticsPeriod;
import RentNest.model.User;
import RentNest.service.AnalyticsException;
import RentNest.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // Get analytics for the authenticated owner's properties.
    @GetMapping("/owner/summary")
    public ResponseEntity<?> getOwnerAnalytics(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            AnalyticsPeriod resolvedPeriod = analyticsService.parsePeriod(from, to);
            return ResponseEntity.ok(analyticsService.ownerSummary(user, resolvedPeriod));
        } catch (AnalyticsException e) {
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", e.getCode(), "message", e.getMessage()));
        }
    }

    // Get analytics for a property owned by the authenticated user.
    @GetMapping("/owner/listings/{listingId}")
    public ResponseEntity<?> getOwnerPropertyListingAnalytics(
            @AuthenticationPrincipal User user,
            @PathVariable Long listingId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            AnalyticsPeriod resolvedPeriod = analyticsService.parsePeriod(from, to);
            return ResponseEntity.ok(analyticsService.listingAnalytics(user, listingId, resolvedPeriod));
        } catch (AnalyticsException e) {
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", e.getCode(), "message", e.getMessage()));
        }
    }

    // Get platform analytics for an authenticated admin.
    @GetMapping("/admin/summary")
    public ResponseEntity<?> getPlatformAnalytics(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        try {
            AnalyticsPeriod resolvedPeriod = analyticsService.parsePeriod(from, to);
            return ResponseEntity.ok(analyticsService.platformSummary(user, resolvedPeriod));
        } catch (AnalyticsException e) {
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", e.getCode(), "message", e.getMessage()));
        }
    }
}
