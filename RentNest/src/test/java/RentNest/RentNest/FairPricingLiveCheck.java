package RentNest.RentNest;

import RentNest.model.api.FairPriceEstimate;
import RentNest.service.FairPricingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Manual smoke check of the AI Fair-Pricing Model against the live HDB dataset.
 * Read-only: it never writes to the database. Skipped unless run with
 *   mvn test -Dtest=FairPricingLiveCheck -Dpricing.live=true
 */
@SpringBootTest
class FairPricingLiveCheck {

    @Autowired
    private FairPricingService fairPricingService;

    @Test
    @EnabledIfSystemProperty(named = "pricing.live", matches = "true")
    void printEstimatesForSampleListings() {
        // Blk 201 Tampines St 21: 2-bedroom (3-ROOM flat), floor 8, asking $2800
        print(fairPricingService.estimate("HDB", 520201, 2, 700, 8, 2800));
        // Blk 105 Ang Mo Kio Ave 4: 3-bedroom (4-ROOM flat), floor 7, asking $3200
        print(fairPricingService.estimate("HDB", 560105, 3, 990, 7, 3200));
        // Same block, 2-bedroom, no asking price (owner view)
        print(fairPricingService.estimate("HDB", 560105, 2, 720, 3, null));
        // Seeded listing 4 (postal resolves to a community hub, so expect no comparables)
        // Existing listing by id (tenant view)
        fairPricingService.estimateForListing(4L).ifPresent(FairPricingLiveCheck::print);
    }

    private static void print(FairPriceEstimate e) {
        assertNotNull(e);
        StringBuilder sb = new StringBuilder("LIVE-CHECK | available=").append(e.isAvailable())
                .append(" source=").append(e.getDataSource())
                .append(" n=").append(e.getComparableCount())
                .append(" fair=").append(e.getFairPrice())
                .append(" asking=").append(e.getAskingPrice())
                .append(" tier=").append(e.getTier())
                .append(" diff=").append(e.getPercentDiffFromFair())
                .append(" period=").append(e.getPeriodStart()).append("..").append(e.getPeriodEnd())
                .append(" basis=").append(e.getBasis())
                .append(" | ").append(e.getMessage());
        if (e.isAvailable()) {
            e.getTiers().forEach(t -> sb.append("\n    ").append(t.getName()).append(" ±").append(t.getTolerancePercent())
                    .append("%: $").append(t.getLow()).append(" - $").append(t.getHigh()));
            sb.append("\n    ").append(e.getFloorAdjustment()).append(" / ").append(e.getSizeAdjustment());
        }
        System.out.println(sb);
    }
}
