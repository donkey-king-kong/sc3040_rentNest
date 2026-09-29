package RentNest.service;

import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NearbyAmenitiesService {

    private static final Logger logger = LoggerFactory.getLogger(NearbyAmenitiesService.class);
    private static final double DEFAULT_RADIUS_METERS = 500.0;

    private final ListingsRepository listingsRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ApiService apiService;
    private final Set<Long> precomputingListingIds = ConcurrentHashMap.newKeySet();

    public NearbyAmenitiesService(ListingsRepository listingsRepository,
                                  JdbcTemplate jdbcTemplate,
                                  ApiService apiService) {
        this.listingsRepository = listingsRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.apiService = apiService;
    }

    @Transactional
    public void precomputeForListing(Long listingId) {
        if (!precomputingListingIds.add(listingId)) {
            logger.info("[NearbyAmenities] Precompute already running for listingId={}", listingId);
            return;
        }

        try {
            doPrecomputeForListing(listingId);
        } finally {
            precomputingListingIds.remove(listingId);
        }
    }

    public void precomputeForListingInBackground(Long listingId) {
        if (!precomputingListingIds.add(listingId)) {
            logger.info("[NearbyAmenities] Background precompute already running for listingId={}", listingId);
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                doPrecomputeForListing(listingId);
            } catch (RuntimeException e) {
                logger.warn("[NearbyAmenities] Background precompute failed for listingId={}: {}", listingId, e.getMessage());
            } finally {
                precomputingListingIds.remove(listingId);
            }
        });
    }

    public NearbyAmenitiesResponse getPrecomputedOrStart(Long listingId) {
        List<Map<String, Object>> amenities = getPrecomputedForListing(listingId);
        if (!amenities.isEmpty()) {
            return new NearbyAmenitiesResponse("READY", amenities);
        }

        precomputeForListingInBackground(listingId);
        return new NearbyAmenitiesResponse("LOADING", List.of());
    }

    private void doPrecomputeForListing(Long listingId) {
        Optional<Listings> listingOptional = listingsRepository.findById(listingId);
        if (listingOptional.isEmpty()) {
            logger.warn("[NearbyAmenities] Listing not found for listingId={}", listingId);
            return;
        }

        Listings listing = listingOptional.get();
        if (listing.getLatitude() == null || listing.getLongitude() == null) {
            logger.warn("[NearbyAmenities] Skipping listingId={} because latitude/longitude is missing", listingId);
            return;
        }

        jdbcTemplate.update("DELETE FROM listing_nearby_amenities WHERE listing_id = ?", listingId);

        precomputeSchools(listingId, listing);
        precomputeHawkerCentres(listingId, listing);
        precomputeBusStops(listingId, listing);
    }

    public List<Map<String, Object>> getPrecomputedForListing(Long listingId) {
        return jdbcTemplate.queryForList("""
                SELECT amenity_type,
                       amenity_ref,
                       name,
                       latitude,
                       longitude,
                       distance_meters,
                       rank
                FROM listing_nearby_amenities
                WHERE listing_id = ?
                ORDER BY amenity_type, rank
                """, listingId);
    }

    private void precomputeSchools(Long listingId, Listings listing) {
        try {
            List<NearbyAmenity> amenities = apiService.getSchoolsByListingId(listingId, DEFAULT_RADIUS_METERS).stream()
                    .map(school -> new NearbyAmenity(
                            school.getPostalCode(),
                            school.getSchoolName(),
                            school.getLatitude(),
                            school.getLongitude(),
                            calculateDistance(listing.getLatitude(), listing.getLongitude(), school.getLatitude(), school.getLongitude())))
                    .sorted(Comparator.comparingDouble(NearbyAmenity::distanceMeters))
                    .limit(5)
                    .toList();
            insertAmenities(listingId, "school", amenities);
        } catch (RuntimeException e) {
            logger.warn("[NearbyAmenities] Failed to precompute schools for listingId={}: {}", listingId, e.getMessage());
        }
    }

    private void precomputeHawkerCentres(Long listingId, Listings listing) {
        try {
            List<NearbyAmenity> amenities = apiService.getHawkerCentresByListingId(listingId, DEFAULT_RADIUS_METERS).stream()
                    .map(hawkerCentre -> new NearbyAmenity(
                            hawkerCentre.getLocationOfCentre(),
                            hawkerCentre.getNameOfCentre(),
                            hawkerCentre.getLatitude(),
                            hawkerCentre.getLongitude(),
                            calculateDistance(listing.getLatitude(), listing.getLongitude(), hawkerCentre.getLatitude(), hawkerCentre.getLongitude())))
                    .sorted(Comparator.comparingDouble(NearbyAmenity::distanceMeters))
                    .limit(5)
                    .toList();
            insertAmenities(listingId, "hawker_centre", amenities);
        } catch (RuntimeException e) {
            logger.warn("[NearbyAmenities] Failed to precompute hawker centres for listingId={}: {}", listingId, e.getMessage());
        }
    }

    private void precomputeBusStops(Long listingId, Listings listing) {
        try {
            List<NearbyAmenity> amenities = apiService.getBusStopsByListingId(listingId, DEFAULT_RADIUS_METERS).stream()
                    .map(busStop -> new NearbyAmenity(
                            busStop.getBusStopCode(),
                            busStop.getDescription(),
                            busStop.getLatitude(),
                            busStop.getLongitude(),
                            calculateDistance(listing.getLatitude(), listing.getLongitude(), busStop.getLatitude(), busStop.getLongitude())))
                    .sorted(Comparator.comparingDouble(NearbyAmenity::distanceMeters))
                    .limit(5)
                    .toList();
            insertAmenities(listingId, "bus_stop", amenities);
        } catch (RuntimeException e) {
            logger.warn("[NearbyAmenities] Failed to precompute bus stops for listingId={}: {}", listingId, e.getMessage());
        }
    }

    private void insertAmenities(Long listingId, String amenityType, List<NearbyAmenity> amenities) {
        for (int i = 0; i < amenities.size(); i++) {
            NearbyAmenity amenity = amenities.get(i);
            jdbcTemplate.update("""
                    INSERT INTO listing_nearby_amenities
                        (listing_id, amenity_type, amenity_ref, name, latitude, longitude, distance_meters, rank)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    listingId,
                    amenityType,
                    amenity.amenityRef(),
                    amenity.name(),
                    amenity.latitude(),
                    amenity.longitude(),
                    amenity.distanceMeters(),
                    i + 1);
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int earthRadiusMeters = 6371000;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private record NearbyAmenity(String amenityRef, String name, double latitude, double longitude, double distanceMeters) {
    }

    public record NearbyAmenitiesResponse(String status, List<Map<String, Object>> amenities) {
    }
}
