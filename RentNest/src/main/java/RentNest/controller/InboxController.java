package RentNest.controller;

import RentNest.dto.InboxListingDTO;
import RentNest.model.User;
import RentNest.service.InboxService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class InboxController {
    private final InboxService inbox;

    public InboxController(InboxService inbox) {
        this.inbox = inbox;
    }

    @GetMapping("/api/listings/inbox")
    public ResponseEntity<List<InboxListingDTO>> getInbox(@AuthenticationPrincipal User user) {
        if (user == null || user.getUserID() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(inbox.getListings(user.getUserID()));
    }
}
