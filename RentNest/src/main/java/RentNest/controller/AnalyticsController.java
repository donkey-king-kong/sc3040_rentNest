package RentNest.controller;

import RentNest.dto.AnalyticsPeriod;
import RentNest.model.User;
import RentNest.service.AnalyticsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

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
            return ResponseEntity.ok(analyticsService.getOwnerAnalytics(user, resolvedPeriod));
        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INVALID_PERIOD");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
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
            return ResponseEntity.ok(analyticsService.getOwnerPropertyListingAnalytics(user, listingId, resolvedPeriod));
        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INVALID_PERIOD");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (NoSuchElementException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "NOT_FOUND");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
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
            return ResponseEntity.ok(analyticsService.getPlatformAnalytics(user, resolvedPeriod));
        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "INVALID_PERIOD");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (SecurityException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "FORBIDDEN");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }
    }
}
