package RentNest.recommendation;

import RentNest.service.ApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Nearby-amenity counts used to ground a listing summary in something other than the
 * listing's own fields.
 *
 * <p>A narrow interface rather than a direct dependency on {@link ApiService}, so the
 * summary feature is not coupled to how the government data APIs happen to be called.
 */
public interface AmenityLookup {

    Counts near(Long listingId, double radiusMeters);

    record Counts(int hawkerCentres, int busStops, int schools) {
        public static final Counts NONE = new Counts(0, 0, 0);
        public boolean isEmpty() { return hawkerCentres == 0 && busStops == 0 && schools == 0; }
    }

    /**
     * Counts from the data.gov.sg and LTA datasets.
     *
     * <p>Each lookup downloads a whole dataset and geocodes every record, so a single call
     * takes tens of seconds. It is only ever made from the background summariser, once per
     * listing, and only when {@code rentnest.ai.summary.include-amenities} is turned on.
     */
    @Component
    class GovernmentDataAmenityLookup implements AmenityLookup {
        private static final Logger log = LoggerFactory.getLogger(GovernmentDataAmenityLookup.class);

        private final ApiService apiService;

        public GovernmentDataAmenityLookup(ApiService apiService) {
            this.apiService = apiService;
        }

        @Override
        public Counts near(Long listingId, double radiusMeters) {
            try {
                return new Counts(
                        apiService.getHawkerCentresByListingId(listingId, radiusMeters).size(),
                        apiService.getBusStopsByListingId(listingId, radiusMeters).size(),
                        apiService.getSchoolsByListingId(listingId, radiusMeters).size());
            } catch (RuntimeException e) {
                log.info("Amenity lookup skipped for listing {}: {}", listingId, e.toString());
                return Counts.NONE;
            }
        }
    }
}
