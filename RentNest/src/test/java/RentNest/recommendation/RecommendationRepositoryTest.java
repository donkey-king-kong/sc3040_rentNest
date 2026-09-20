package RentNest.recommendation;

import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.ListingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class RecommendationRepositoryTest {
    @Autowired TestEntityManager entityManager;
    @Autowired ListingsRepository repository;
    private User user(String email, int flagged) {
        return entityManager.persist(new User().setName(email).setEmail(email).setPassword("test").setFlagged(flagged));
    }
    private Listings listing(User owner, User tenant, boolean flagged) {
        Listings l = new Listings(); l.setOwner(owner); l.setTenant(tenant); l.setFlagged(flagged); l.setPrice(2000);
        return entityManager.persist(l);
    }
    @Test void eligibilityExcludesOwnOccupiedFlaggedAndBannedOwnerListings() {
        User viewer = user("viewer@example.test", 0), owner = user("owner@example.test", 0);
        Listings eligible = listing(owner, null, false);
        listing(viewer, null, false);
        listing(owner, viewer, false);
        listing(owner, null, true);
        listing(user("banned@example.test", 2), null, false);
        listing(user("flagged@example.test", 1), null, false);
        entityManager.flush(); entityManager.clear();
        var result = repository.findRecommendationCandidates(viewer.getUserID());
        assertEquals(1, result.size());
        assertEquals(eligible.getListingID(), result.getFirst().getListingID());
    }
}
