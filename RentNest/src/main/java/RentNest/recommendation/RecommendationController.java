package RentNest.recommendation;

import RentNest.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/listings/recommendations")
public class RecommendationController {
    private final RecommendationService service;
    public RecommendationController(RecommendationService service) { this.service = service; }

    @PostMapping
    public RecommendationResponse recommend(@RequestBody RecommendationRequest request,
                                            @AuthenticationPrincipal User user) {
        return service.recommend(request, user.getUserID());
    }
}
