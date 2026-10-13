package RentNest.controller;

import RentNest.dto.OwnerPaymentsDTO;
import RentNest.dto.OwnerRentalInfoDTO;
import RentNest.dto.OwnerTenantSummaryDTO;
import RentNest.model.User;
import RentNest.service.RentalDetailService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/owner")
public class RentalDetailController {
    private final RentalDetailService details;

    public RentalDetailController(RentalDetailService details) {
        this.details = details;
    }

    @GetMapping("/listings/{listingId}/rental-info")
    public ResponseEntity<OwnerRentalInfoDTO> rentalInfo(@AuthenticationPrincipal User user, @PathVariable Long listingId) {
        return noStore(details.rentalInfo(actor(user), positive(listingId)));
    }

    @GetMapping("/listings/{listingId}/tenants/{tenantId}")
    public ResponseEntity<OwnerTenantSummaryDTO> tenantSummary(@AuthenticationPrincipal User user,
            @PathVariable Long listingId, @PathVariable Long tenantId) {
        return noStore(details.tenantSummary(actor(user), positive(listingId), positive(tenantId)));
    }

    @GetMapping("/rentals/{rentalId}/payments")
    public ResponseEntity<OwnerPaymentsDTO> payments(@AuthenticationPrincipal User user, @PathVariable Long rentalId) {
        return noStore(details.paymentSummary(actor(user), positive(rentalId)));
    }

    private static Long actor(User user) {
        if (user == null || user.getUserID() == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return user.getUserID();
    }

    private static Long positive(Long id) {
        if (id == null || id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return id;
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
