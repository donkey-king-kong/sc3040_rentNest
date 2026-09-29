package RentNest.service;

import RentNest.model.PostalCodeCoordinate;
import RentNest.repository.PostalCodeCoordinateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
public class GeocodingService {

    private static final Logger logger = LoggerFactory.getLogger(GeocodingService.class);

    private final PostalCodeCoordinateRepository postalCodeCoordinateRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeocodingService(PostalCodeCoordinateRepository postalCodeCoordinateRepository) {
        this.postalCodeCoordinateRepository = postalCodeCoordinateRepository;
    }

    @PostConstruct
    public void warnIfSeedDataMissing() {
        if (postalCodeCoordinateRepository.count() == 0) {
            logger.warn("postal_code_coordinates is empty. Run RentNest/scripts/import_postal_code_coordinates.py and import the generated CSV before creating listings.");
        }
    }

    public Optional<Coordinates> getCoordinates(String postalCode) {
        String normalizedPostalCode = normalizePostalCode(postalCode);
        if (normalizedPostalCode == null) {
            logger.warn("[Geocoding] Cannot resolve blank or invalid postal code={}", postalCode);
            return Optional.empty();
        }

        Optional<PostalCodeCoordinate> existingCoordinate = postalCodeCoordinateRepository.findById(normalizedPostalCode);
        if (existingCoordinate.isPresent()) {
            PostalCodeCoordinate coordinate = existingCoordinate.get();
            return Optional.of(new Coordinates(coordinate.getLatitude(), coordinate.getLongitude()));
        }

        Optional<Coordinates> oneMapCoordinates = fetchCoordinatesFromOneMap(normalizedPostalCode);
        oneMapCoordinates.ifPresent(coordinates -> persistCoordinate(normalizedPostalCode, coordinates));
        return oneMapCoordinates;
    }

    public Optional<Coordinates> getStoredCoordinates(String postalCode) {
        String normalizedPostalCode = normalizePostalCode(postalCode);
        if (normalizedPostalCode == null) {
            return Optional.empty();
        }

        return postalCodeCoordinateRepository.findById(normalizedPostalCode)
                .map(coordinate -> new Coordinates(coordinate.getLatitude(), coordinate.getLongitude()));
    }

    private String normalizePostalCode(String postalCode) {
        if (postalCode == null) {
            return null;
        }

        String normalizedPostalCode = postalCode.trim();
        if (normalizedPostalCode.isEmpty() || normalizedPostalCode.equalsIgnoreCase("NIL")) {
            return null;
        }

        if (!normalizedPostalCode.matches("\\d{1,6}")) {
            return null;
        }

        return String.format("%06d", Integer.parseInt(normalizedPostalCode));
    }

    private Optional<Coordinates> fetchCoordinatesFromOneMap(String postalCode) {
        String encodedPostalCode = UriUtils.encode(postalCode, StandardCharsets.UTF_8);
        String geocodeUrl = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal="
                + encodedPostalCode + "&returnGeom=Y&getAddrDetails=N";

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(geocodeUrl, HttpMethod.GET, null, String.class);
        } catch (RestClientException e) {
            logger.warn("[Geocoding] OneMap lookup failed for postalCode={}: {}", postalCode, e.getMessage());
            return Optional.empty();
        }

        try {
            JsonNode resultsNode = objectMapper.readTree(response.getBody()).path("results");
            if (!resultsNode.isArray() || resultsNode.isEmpty()) {
                logger.warn("[Geocoding] OneMap returned no results for postalCode={}", postalCode);
                return Optional.empty();
            }

            double latitude = resultsNode.get(0).path("LATITUDE").asDouble();
            double longitude = resultsNode.get(0).path("LONGITUDE").asDouble();
            if (latitude == 0.0 && longitude == 0.0) {
                logger.warn("[Geocoding] OneMap returned invalid coordinates for postalCode={}", postalCode);
                return Optional.empty();
            }

            return Optional.of(new Coordinates(latitude, longitude));
        } catch (Exception e) {
            logger.warn("[Geocoding] Failed to parse OneMap response for postalCode={}: {}", postalCode, e.getMessage());
            return Optional.empty();
        }
    }

    private void persistCoordinate(String postalCode, Coordinates coordinates) {
        PostalCodeCoordinate postalCodeCoordinate = new PostalCodeCoordinate();
        postalCodeCoordinate.setPostalCode(postalCode);
        postalCodeCoordinate.setLatitude(coordinates.latitude());
        postalCodeCoordinate.setLongitude(coordinates.longitude());
        postalCodeCoordinate.setSource("onemap_api");
        postalCodeCoordinateRepository.save(postalCodeCoordinate);
    }

    public record Coordinates(double latitude, double longitude) {
    }
}
