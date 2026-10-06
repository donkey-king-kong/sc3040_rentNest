package RentNest.service;

import RentNest.model.Listings;
import RentNest.model.api.*;
import RentNest.repository.ListingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.stream.Collectors;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


@Service
public class ApiService {

    private static final Logger logger = LoggerFactory.getLogger(ApiService.class);

    private RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, double[]> postalCodeCoordinateCache = new ConcurrentHashMap<>();

    @Autowired
    private ListingsRepository listingsRepository;

    @Autowired
    private GeocodingService geocodingService;

    private int getPostalByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getPostal)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    private int getBedsByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getBeds)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    private String getTypeByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getType)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    public List<School> getSchoolsByListingId(Long listingId, double radiusMeters) {
        double[] listingCoordinates = getCoordinatesForListing(listingId);
        if (!hasValidCoordinates(listingCoordinates)) {
            return new ArrayList<>();
        }
        return getSchoolsNearCoordinates(listingCoordinates[0], listingCoordinates[1], radiusMeters);
    }

    public List<School> getSchoolsNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from the local postal_code_coordinates table.
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        if (!hasValidCoordinates(postalCoordinates)) {
            logger.warn("[Coordinates] Skipping nearby schools because postalCode={} could not be resolved", postalCode);
            return new ArrayList<>();
        }
        return getSchoolsNearCoordinates(postalCoordinates[0], postalCoordinates[1], radiusMeters);
    }

    public List<School> getSchoolsNearCoordinates(double latitude, double longitude, double radiusMeters) {
        List<School> schools = new ArrayList<>();

        // Retrieve all school entries using offset parameter
        String datasetId = "d_688b934f82c1059ed0a6993d2a829089";
        String url = "https://data.gov.sg/api/action/datastore_search?resource_id=" + datasetId + "&limit=10000";
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, null, String.class);

        schools = parseSchools(response.getBody());

        // Filter schools within radius
        List<School> nearbySchools = new ArrayList<>();
        for (School school : schools) {
            double[] schoolCoordinates = getCoordinatesFromPostalCode(school.getPostalCode());
            if (!hasValidCoordinates(schoolCoordinates)) {
                continue;
            }
            double schoolLatitude = schoolCoordinates[0];
            school.setLatitude(schoolLatitude);
            double schoolLongitude = schoolCoordinates[1];
            school.setLongitude(schoolLongitude);
            double distance = calculateDistance(latitude, longitude, schoolLatitude, schoolLongitude);
            if (distance <= radiusMeters) {
                nearbySchools.add(school);
            }
        }

        return nearbySchools;
    }

    // Parse schools from JSON
    private List<School> parseSchools(String jsonResponse) {
        List<School> schools = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultNode = root.path("result");
            JsonNode recordsNode = resultNode.path("records");
            if (recordsNode.isArray()) {
                for (JsonNode schoolNode : recordsNode) {
                    School school = new School();
                    school.setSchoolName(schoolNode.path("school_name").asText());
                    school.setUrlAddress(schoolNode.path("url_address").asText());
                    school.setAddress(schoolNode.path("address").asText());
                    school.setPostalCode(schoolNode.path("postal_code").asText());
                    school.setTelephoneNo(schoolNode.path("telephone_no").asText());
                    school.setEmailAddress(schoolNode.path("email_address").asText());
                    school.setMainLevelCode(schoolNode.path("mainlevel_code").asText());
                    schools.add(school);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return schools;
    }

    public List<HawkerCentre> getHawkerCentresByListingId(Long listingId, double radiusMeters) {
        double[] listingCoordinates = getCoordinatesForListing(listingId);
        if (!hasValidCoordinates(listingCoordinates)) {
            return new ArrayList<>();
        }
        return getHawkerCentresNearCoordinates(listingCoordinates[0], listingCoordinates[1], radiusMeters);
    }

    public List<HawkerCentre> getHawkerCentresNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from the local postal_code_coordinates table.
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        if (!hasValidCoordinates(postalCoordinates)) {
            logger.warn("[Coordinates] Skipping nearby hawker centres because postalCode={} could not be resolved", postalCode);
            return new ArrayList<>();
        }
        return getHawkerCentresNearCoordinates(postalCoordinates[0], postalCoordinates[1], radiusMeters);
    }

    public List<HawkerCentre> getHawkerCentresNearCoordinates(double latitude, double longitude, double radiusMeters) {
        List<HawkerCentre> hawkerCentres = new ArrayList<>();

        // Retrieve all hawker centre entries using offset parameter
        String url = "https://data.gov.sg/api/action/datastore_search?resource_id=d_68a42f09f350881996d83f9cd73ab02f" + "&limit=10000";
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, null, String.class);
        hawkerCentres = parseHawkerCentres(response.getBody());

        // Filter hawker centres within radius
        List<HawkerCentre> nearbyHawkerCentres = new ArrayList<>();
        for (HawkerCentre hawkerCentre : hawkerCentres) {
            String hawkerPostalCode = extractHawkerPostalCode(hawkerCentre.getLocationOfCentre());
            if (hawkerPostalCode != null) {
                double[] hawkerCoordinates = getCoordinatesFromPostalCode(hawkerPostalCode);
                if (!hasValidCoordinates(hawkerCoordinates)) {
                    continue;
                }
                double hawkerLatitude = hawkerCoordinates[0];
                hawkerCentre.setLatitude(hawkerLatitude);
                double hawkerLongitude = hawkerCoordinates[1];
                hawkerCentre.setLongitude(hawkerLongitude);
                double distance = calculateDistance(latitude, longitude, hawkerLatitude, hawkerLongitude);
                if (distance <= radiusMeters) {
                    nearbyHawkerCentres.add(hawkerCentre);
                }
            }
        }

        return nearbyHawkerCentres;
    }

    // Extract postal code from location string
    private String extractHawkerPostalCode(String location) {
        // Handle multiple postal codes in the format 'S(######/######)'
        int startIndex = location.indexOf("S(") + 2;
        int endIndex = location.indexOf(")", startIndex);
        if (startIndex > 1 && endIndex > startIndex) {
            String postalCodes = location.substring(startIndex, endIndex);
            // Split if there are multiple postal codes and return the first one
            return postalCodes.split("/")[0];
        }
        return null;
    }

    // Parse hawker centres from JSON
    private List<HawkerCentre> parseHawkerCentres(String jsonResponse) {
        List<HawkerCentre> hawkerCentres = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultNode = root.path("result");
            JsonNode recordsNode = resultNode.path("records");
            if (recordsNode.isArray()) {
                for (JsonNode hawkerNode : recordsNode) {
                    HawkerCentre hawkerCentre = new HawkerCentre();
                    hawkerCentre.setNameOfCentre(hawkerNode.path("name_of_centre").asText());
                    hawkerCentre.setLocationOfCentre(hawkerNode.path("location_of_centre").asText());
                    hawkerCentre.setTypeOfCentre(hawkerNode.path("type_of_centre").asText());
                    hawkerCentre.setOwner(hawkerNode.path("owner").asText());
                    hawkerCentre.setNoOfStalls(hawkerNode.path("no_of_stalls").asInt());
                    hawkerCentre.setNoOfCookedFoodStalls(hawkerNode.path("no_of_cooked_food_stalls").asInt());
                    hawkerCentre.setNoOfMktProduceStalls(hawkerNode.path("no_of_mkt_produce_stalls").asInt());
                    hawkerCentres.add(hawkerCentre);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return hawkerCentres;
    }

    @Value("${LTADATAMALL_ACCOUNTKEY}")
    private String LTADATAMALL_ACCOUNTKEY;

    public List<BusStop> getBusStopsByListingId(Long listingId, double radiusMeters) {
        double[] listingCoordinates = getCoordinatesForListing(listingId);
        if (!hasValidCoordinates(listingCoordinates)) {
            return new ArrayList<>();
        }
        logger.info("[LTA DataMall] Fetching bus stops for listingId={}, latitude={}, longitude={}, radiusMeters={}",
                listingId, listingCoordinates[0], listingCoordinates[1], radiusMeters);
        return getBusStopsNearCoordinates(listingCoordinates[0], listingCoordinates[1], radiusMeters);
    }

    public List<BusStop> getBusStopsNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from the local postal_code_coordinates table.
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        if (!hasValidCoordinates(postalCoordinates)) {
            logger.warn("[Coordinates] Skipping nearby bus stops because postalCode={} could not be resolved", postalCode);
            return new ArrayList<>();
        }
        double postalLatitude = postalCoordinates[0];
        double postalLongitude = postalCoordinates[1];
        logger.info("[LTA DataMall] Postal code {} resolved to latitude={}, longitude={}",
                postalCode, postalLatitude, postalLongitude);
        return getBusStopsNearCoordinates(postalLatitude, postalLongitude, radiusMeters);
    }

    public List<BusStop> getBusStopsNearCoordinates(double latitude, double longitude, double radiusMeters) {
        List<BusStop> busStops = new ArrayList<>();
        int skip = 0;
        boolean hasMoreData = true;
        boolean hasAccountKey = LTADATAMALL_ACCOUNTKEY != null && !LTADATAMALL_ACCOUNTKEY.trim().isEmpty();
        logger.info("[LTA DataMall] AccountKey configured={}", hasAccountKey);

        // Retrieve all bus stops using $skip parameter
        while (hasMoreData) {
            String url = "https://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip=" + skip;
            HttpHeaders headers = new HttpHeaders();
            headers.set("AccountKey", LTADATAMALL_ACCOUNTKEY);
            logger.info("[LTA DataMall] Calling BusStops endpoint with skip={}", skip);

            ResponseEntity<String> response;
            try {
                response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            } catch (RestClientException e) {
                logger.error("[LTA DataMall] BusStops request failed for skip={}: {}", skip, e.getMessage(), e);
                throw e;
            }

            List<BusStop> partialBusStops = parseBusStops(response.getBody());
            logger.info("[LTA DataMall] BusStops response skip={} status={} parsedCount={}",
                    skip, response.getStatusCode(), partialBusStops.size());
            if (partialBusStops.isEmpty()) {
                hasMoreData = false;
            } else {
                busStops.addAll(partialBusStops);
                skip += 500;
            }
        }
        logger.info("[LTA DataMall] Finished fetching bus stops. totalFetched={}", busStops.size());
        
        // Filter bus stops within radius
        List<BusStop> nearbyBusStops = new ArrayList<>();
        for (BusStop busStop : busStops) {
            double distance = calculateDistance(latitude, longitude, busStop.getLatitude(), busStop.getLongitude());
            if (distance <= radiusMeters) {
                nearbyBusStops.add(busStop);
            }
        }
        logger.info("[LTA DataMall] Nearby bus stops found={} within radiusMeters={} for latitude={}, longitude={}",
                nearbyBusStops.size(), radiusMeters, latitude, longitude);
        
        return nearbyBusStops;
    }

    // Parse bus stops from JSON
    private List<BusStop> parseBusStops(String jsonResponse) {
        List<BusStop> busStops = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode valueNode = root.path("value");
            if (valueNode.isArray()) {
                for (JsonNode busStopNode : valueNode) {
                    BusStop busStop = new BusStop();
                    busStop.setBusStopCode(busStopNode.path("BusStopCode").asText());
                    busStop.setRoadName(busStopNode.path("RoadName").asText());
                    busStop.setDescription(busStopNode.path("Description").asText());
                    busStop.setLatitude(busStopNode.path("Latitude").asDouble());
                    busStop.setLongitude(busStopNode.path("Longitude").asDouble());
                    busStops.add(busStop);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return busStops;
    }

    // Function to get latitude and longitude from the imported OneMap CSV table.
    private double[] getCoordinatesFromPostalCode(String postalCode) {
        String normalizedPostalCode = postalCode == null ? "" : postalCode.trim();
        if (normalizedPostalCode.isEmpty()) {
            logger.warn("[Coordinates] Cannot resolve blank postal code");
            return new double[]{0.0, 0.0};
        }

        double[] cachedCoordinates = postalCodeCoordinateCache.get(normalizedPostalCode);
        if (cachedCoordinates != null) {
            logger.debug("[Coordinates] Using cached coordinates for postalCode={}", normalizedPostalCode);
            return copyCoordinates(cachedCoordinates);
        }

        return geocodingService.getStoredCoordinates(normalizedPostalCode)
                .map(coordinates -> {
                    double[] coordinateArray = new double[]{coordinates.latitude(), coordinates.longitude()};
                    postalCodeCoordinateCache.put(normalizedPostalCode, copyCoordinates(coordinateArray));
                    return coordinateArray;
                })
                .orElseGet(() -> {
                    logger.warn("[Coordinates] Postal code {} not found in postal_code_coordinates", normalizedPostalCode);
                    return new double[]{0.0, 0.0};
                });
    }

    private double[] getCoordinatesForListing(Long listingId) {
        Listings listing = listingsRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + listingId));
        if (listing.getLatitude() != null && listing.getLongitude() != null) {
            return new double[]{listing.getLatitude(), listing.getLongitude()};
        }

        logger.warn("[Coordinates] Listing {} has no saved latitude/longitude; falling back to postal code lookup", listingId);
        return getCoordinatesFromPostalCode(Integer.toString(listing.getPostal()));
    }

    private int countOneMapResults(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray()) {
                return resultsNode.size();
            }
        } catch (IOException e) {
            logger.warn("[OneMap] Failed to parse postal code lookup response: {}", e.getMessage());
        }
        return 0;
    }

    private boolean hasValidCoordinates(double[] coordinates) {
        return coordinates != null
                && coordinates.length == 2
                && !(coordinates[0] == 0.0 && coordinates[1] == 0.0);
    }

    private double[] copyCoordinates(double[] coordinates) {
        return new double[]{coordinates[0], coordinates[1]};
    }

    // Parse latitude from OneMap API response
    private double parseLatitude(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray() && resultsNode.size() > 0) {
                return resultsNode.get(0).path("LATITUDE").asDouble();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return 0.0;
    }

    // Parse longitude from OneMap API response
    private double parseLongitude(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray() && resultsNode.size() > 0) {
                return resultsNode.get(0).path("LONGITUDE").asDouble();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return 0.0;
    }

    // Haversine formula to calculate the distance between two latitude/longitude pairs
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the Earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // convert to meters
    }

    @Value("${URA_ACCESSKEY}")
    private String URA_ACCESSKEY;

    /** data.gov.sg API key, sent as x-api-key; blank means anonymous (lower rate limit). */
    @Value("${DATAGOVSG_API_KEY:}")
    private String DATAGOVSG_API_KEY;

    /** Months of history shown in a listing's Price Insights table. */
    static final int PRICE_INSIGHT_MONTHS = 12;
    static final double PRIVATE_INSIGHT_RADIUS_M = 500;
    static final double PRIVATE_WIDE_RADIUS_M = 1500;

    /**
     * Price Insights for a listing: the median monthly rent of comparable units for
     * each of the last {@value #PRICE_INSIGHT_MONTHS} months with transactions, newest
     * first. HDB uses the flat type stated in the listing ("5-room") or implied by its
     * bedrooms; private property uses URA contracts in the same project, falling back
     * to the same bedroom count within 500 m. Returns an empty list (never fails) when
     * data is unavailable.
     */
    public List<RentalPrices> getPastRentalPricesByListingId(Long listingId) {
        try {
            Listings listing = listingsRepository.findById(listingId).orElse(null);
            if (listing == null || listing.getPostal() == null) return new ArrayList<>();
            String postalCode = String.format("%06d", listing.getPostal());
            List<Object[]> monthAndRent = new ArrayList<>(); // {yyyy-MM, rent}

            if ("HDB".equalsIgnoreCase(listing.getType())) {
                String flatType = hdbFlatTypeForListing(
                        listing.getName(), listing.getDescription(), listing.getBeds(), listing.getSize());
                List<HDBRentalContract> hdb = getHDBRentalContractsByFlatType(postalCode, flatType);
                if (hdb.size() < 3 && hasText(listing.getLocation())) {
                    // Postal code unknown to OneMap or not a residential block: use the street stored on the listing.
                    List<HDBRentalContract> byStreet = getHDBRentalContractsByStreet(normaliseHdbStreetName(listing.getLocation()), flatType);
                    if (byStreet.size() > hdb.size()) hdb = byStreet;
                }
                String town = hdbTownIn(listing.getLocation());
                if (hdb.size() < 3 && town != null) {
                    hdb = getHDBRentalContractsByTown(town, flatType);
                }
                for (HDBRentalContract c : hdb) {
                    monthAndRent.add(new Object[]{c.getRentApprovalDate(), c.getMonthlyRent()});
                }
            } else {
                boolean landed = "Landed".equalsIgnoreCase(listing.getType());
                String beds = landed ? "NA" : String.valueOf(listing.getBeds());
                List<RentalContract> contracts = new ArrayList<>();
                String project = getProjectNameFromPostalCode(postalCode);
                if (!landed && project != null && !project.isBlank()
                        && !"Address not found".equals(project) && !"NIL".equalsIgnoreCase(project)) {
                    contracts = getRentalContractsByProject(project, 1, beds);
                }
                if (contracts.size() < 3) {
                    contracts = getRentalContractsNearPostalCode(postalCode, PRIVATE_INSIGHT_RADIUS_M, 1, beds);
                }
                if (contracts.size() < 3 && hasText(listing.getLocation())) {
                    contracts = getRentalContractsByStreet(listing.getLocation(), 1, beds);
                }
                if (contracts.size() < 3) {
                    contracts = getRentalContractsNearPostalCode(postalCode, PRIVATE_WIDE_RADIUS_M, 1, beds);
                }
                if (contracts.size() < 3) {
                    contracts = getRentalContractsNearPostalCode(postalCode, 3000, 1, beds);
                }
                for (RentalContract c : contracts) {
                    monthAndRent.add(new Object[]{c.getLeaseDate(), c.getRent()});
                }
            }
            return monthlyMedians(monthAndRent, PRICE_INSIGHT_MONTHS);
        } catch (RuntimeException e) {
            logger.warn("[PriceInsights] Could not load price insights for listingId={}: {}", listingId, e.getMessage());
            return new ArrayList<>();
        }
    }

    private static final java.util.regex.Pattern HDB_FLAT_TYPE_IN_TEXT =
            java.util.regex.Pattern.compile("\\b([1-5])[- ]?room\\b|\\b(executive|maisonette)\\b");

    /**
     * HDB flat type for a listing: the type stated in its title or description
     * ("Tampines HDB 5-Room") when present, otherwise implied by its bedrooms
     * (HDB counts the living room, so 2 bedrooms is a 3-ROOM flat).
     */
    public static String hdbFlatTypeForListing(String name, String description, Integer beds, Integer sizeSqft) {
        String text = ((name == null ? "" : name) + " " + (description == null ? "" : description)).toLowerCase();
        java.util.regex.Matcher m = HDB_FLAT_TYPE_IN_TEXT.matcher(text);
        if (m.find()) {
            return m.group(1) != null ? m.group(1) + "-ROOM" : "EXECUTIVE";
        }
        int b = beds == null ? 3 : beds;
        if (b <= 1) return "2-ROOM";
        if (b == 2) return "3-ROOM";
        if (b == 3) return (sizeSqft != null && sizeSqft >= 1150) ? "5-ROOM" : "4-ROOM";
        return "EXECUTIVE";
    }

    /** One row per month (newest first): the median rent, rounded to $10. */
    public static List<RentalPrices> monthlyMedians(List<Object[]> monthAndRent, int months) {
        Map<String, List<Integer>> byMonth = new java.util.TreeMap<>(java.util.Comparator.reverseOrder());
        for (Object[] row : monthAndRent) {
            String month = (String) row[0];
            int rent = (Integer) row[1];
            if (month == null || month.length() < 7 || rent <= 0) continue;
            byMonth.computeIfAbsent(month.substring(0, 7), k -> new ArrayList<>()).add(rent);
        }
        List<RentalPrices> out = new ArrayList<>();
        for (Map.Entry<String, List<Integer>> e : byMonth.entrySet()) {
            if (out.size() >= months) break;
            List<Integer> rents = e.getValue();
            rents.sort(null);
            int n = rents.size();
            double median = n % 2 == 1 ? rents.get(n / 2) : (rents.get(n / 2 - 1) + rents.get(n / 2)) / 2.0;
            out.add(new RentalPrices(formatDate(e.getKey()), (int) (Math.round(median / 10.0) * 10)));
        }
        return out;
    }

    private static String formatDate(String dateStr) {
        try {
            SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM");
            Date date = inputFormat.parse(dateStr);
            SimpleDateFormat outputFormat = new SimpleDateFormat("MMM yyyy");
            return outputFormat.format(date);
        } catch (ParseException e) {
            return dateStr;
        }
    }

    // ---------------------------------------------------------------------
    // URA private residential rental contracts (PMI_Resi_Rental)
    // ---------------------------------------------------------------------

    private static final String URA_TOKEN_URL = "https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1";
    private static final String URA_RENTAL_URL = "https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1?service=PMI_Resi_Rental&refPeriod=";
    /** URA's daily token is reused for most of a day. */
    private static final long URA_TOKEN_TTL_MILLIS = 12 * 60 * 60 * 1000L;
    /** The current quarter is still filling up; past quarters never change. */
    private static final long URA_CURRENT_QUARTER_TTL_MILLIS = 6 * 60 * 60 * 1000L;

    private record CachedQuarter(long fetchedAt, List<RentalContract> contracts) {}
    private final Map<String, CachedQuarter> uraQuarterCache = new ConcurrentHashMap<>();
    private volatile String uraToken;
    private volatile long uraTokenFetchedAt;

    public List<RentalContract> getRentalContractsNearPostalCode(String postalCode, double radiusMeters, int years, String noOfBedRoom) {
        double[] postal = getXYCoordinatesFromPostalCode(postalCode);
        if (postal[0] == 0.0 && postal[1] == 0.0) return new ArrayList<>();

        List<RentalContract> nearby = new ArrayList<>();
        for (RentalContract c : getUraRentalContracts(years)) {
            if (isWithinRange(postal[0], postal[1], c.getX(), c.getY(), radiusMeters)
                    && c.getNoOfBedRoom().equals(noOfBedRoom)) {
                nearby.add(c);
            }
        }
        nearby.sort((a, b) -> b.getLeaseDate().compareTo(a.getLeaseDate()));
        return nearby;
    }

    public List<RentalContract> getRentalContractsByProject(String projectName, int years, String noOfBedRoom) {
        List<RentalContract> matches = new ArrayList<>();
        for (RentalContract c : getUraRentalContracts(years)) {
            if (c.getProject().equalsIgnoreCase(projectName) && c.getNoOfBedRoom().equals(noOfBedRoom)) {
                matches.add(c);
            }
        }
        matches.sort((a, b) -> b.getLeaseDate().compareTo(a.getLeaseDate()));
        return matches;
    }

    /** URA contracts on a street (e.g. "Marine Parade Road"), for the same bedroom count. */
    public List<RentalContract> getRentalContractsByStreet(String street, int years, String noOfBedRoom) {
        String target = street.trim().toUpperCase();
        List<RentalContract> matches = new ArrayList<>();
        for (RentalContract c : getUraRentalContracts(years)) {
            if (target.equals(c.getStreet()) && c.getNoOfBedRoom().equals(noOfBedRoom)) {
                matches.add(c);
            }
        }
        matches.sort((a, b) -> b.getLeaseDate().compareTo(a.getLeaseDate()));
        return matches;
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /** All URA rental contracts for the past {@code years}, one cached download per quarter. */
    private List<RentalContract> getUraRentalContracts(int years) {
        List<String> refPeriods = getRefPeriodsForPastYears(years);
        String currentQuarter = refPeriods.get(0);
        List<RentalContract> all = new ArrayList<>();
        for (String refPeriod : refPeriods) {
            CachedQuarter cached = uraQuarterCache.get(refPeriod);
            boolean stale = cached == null || (refPeriod.equals(currentQuarter)
                    && System.currentTimeMillis() - cached.fetchedAt() > URA_CURRENT_QUARTER_TTL_MILLIS);
            if (stale) {
                HttpHeaders headers = new HttpHeaders();
                headers.set("AccessKey", URA_ACCESSKEY);
                headers.set("Token", getUraToken());
                ResponseEntity<String> response = restTemplate.exchange(URA_RENTAL_URL + refPeriod, HttpMethod.GET,
                        new HttpEntity<>(headers), String.class);
                cached = new CachedQuarter(System.currentTimeMillis(), parseRentalContracts(response.getBody()));
                uraQuarterCache.put(refPeriod, cached);
            }
            all.addAll(cached.contracts());
        }
        return all;
    }

    private String getUraToken() {
        if (uraToken != null && System.currentTimeMillis() - uraTokenFetchedAt < URA_TOKEN_TTL_MILLIS) {
            return uraToken;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("AccessKey", URA_ACCESSKEY);
        ResponseEntity<String> response = restTemplate.exchange(URA_TOKEN_URL, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        String token = extractToken(response.getBody());
        if (token == null || token.isBlank()) {
            throw new RuntimeException("URA did not return a token (check URA_ACCESSKEY)");
        }
        uraToken = token;
        uraTokenFetchedAt = System.currentTimeMillis();
        return token;
    }

    private List<RentalContract> parseRentalContracts(String jsonResponse) {
        List<RentalContract> rentalContracts = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(jsonResponse);
            JsonNode resultNode = rootNode.path("Result");
            if (resultNode.isArray()) {
                for (JsonNode propertyNode : resultNode) {
                    JsonNode rentalArrayNode = propertyNode.path("rental");
                    if (rentalArrayNode.isArray()) {
                        for (JsonNode rentalNode : rentalArrayNode) {
                            String leaseDate = rentalNode.path("leaseDate").asText();
                            if (leaseDate.length() < 4) continue;
                            RentalContract rentalContract = new RentalContract();
                            rentalContract.setAreaSqm(rentalNode.path("areaSqm").asText());
                            rentalContract.setLeaseDate("20" + leaseDate.substring(2) + "-" + leaseDate.substring(0, 2));
                            rentalContract.setPropertyType(rentalNode.path("propertyType").asText());
                            rentalContract.setDistrict(rentalNode.path("district").asText());
                            rentalContract.setAreaSqft(rentalNode.path("areaSqft").asText());
                            rentalContract.setNoOfBedRoom(rentalNode.path("noOfBedRoom").asText());
                            rentalContract.setRent(rentalNode.path("rent").asInt());
                            rentalContract.setX(propertyNode.path("x").asDouble());
                            rentalContract.setY(propertyNode.path("y").asDouble());
                            rentalContract.setProject(propertyNode.path("project").asText());
                            rentalContract.setStreet(propertyNode.path("street").asText().toUpperCase());
                            rentalContracts.add(rentalContract);
                        }
                    }
                }
            }
        } catch (IOException e) {
            logger.warn("[URA] Could not parse rental contracts: {}", e.getMessage());
        }
        return rentalContracts;
    }

    private String extractToken(String response) {
        try {
            JsonNode rootNode = objectMapper.readTree(response);
            return rootNode.path("Result").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract token from response", e);
        }
    }

    private List<String> getRefPeriodsForPastYears(int years) {
        List<String> refPeriods = new ArrayList<>();
        int currentYear = java.time.Year.now().getValue();
        int currentQuarter = (java.time.MonthDay.now().getMonthValue() - 1) / 3 + 1;

        for (int year = currentYear; year >= currentYear - years; year--) {
            int startQuarter = (year == currentYear) ? currentQuarter : 4;
            int endQuarter = (year == currentYear - years) ? currentQuarter : 1;

            for (int quarter = startQuarter; quarter >= endQuarter; quarter--) {
                String refPeriod = String.format("%02dq%d", year % 100, quarter);
                refPeriods.add(refPeriod);
            }
        }
        return refPeriods;
    }

    // Function to check if property is within range based on x and y values
    private boolean isWithinRange(double postalX, double postalY, double propertyX, double propertyY, double rangeMeters) {
        double deltaX = propertyX - postalX;
        double deltaY = propertyY - postalY;
        double distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return distance <= rangeMeters;
    }

    // ---------------------------------------------------------------------
    // OneMap postal code search
    // ---------------------------------------------------------------------

    /**
     * OneMap's search is rate-limited for callers without an account token (a few
     * requests in quick succession, then HTTP 429), so each postal code is looked up
     * once and cached; a 429 is retried after a short wait.
     */
    private final Map<String, JsonNode> oneMapCache = new ConcurrentHashMap<>();
    private static final int ONEMAP_MAX_ATTEMPTS = 3;
    private static final long ONEMAP_RETRY_WAIT_MILLIS = 1500;

    /** First OneMap search result for a postal code (with address details and SVY21 X/Y), or null. */
    private JsonNode oneMapSearch(String postalCode) {
        JsonNode cached = oneMapCache.get(postalCode);
        if (cached != null) return cached;

        String url = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=" + postalCode + "&returnGeom=Y&getAddrDetails=Y";
        for (int attempt = 1; attempt <= ONEMAP_MAX_ATTEMPTS; attempt++) {
            try {
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, null, String.class);
                JsonNode results = objectMapper.readTree(response.getBody()).path("results");
                if (results.isArray() && results.size() > 0) {
                    oneMapCache.put(postalCode, results.get(0));
                    return results.get(0);
                }
                return null;
            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                if (attempt == ONEMAP_MAX_ATTEMPTS) {
                    logger.warn("[OneMap] Rate limited looking up postal code {}", postalCode);
                    return null;
                }
                try {
                    Thread.sleep(ONEMAP_RETRY_WAIT_MILLIS * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return null;
                }
            } catch (IOException | RestClientException e) {
                logger.warn("[OneMap] Lookup failed for postal code {}: {}", postalCode, e.getMessage());
                return null;
            }
        }
        return null;
    }

    private double[] getXYCoordinatesFromPostalCode(String postalCode) {
        JsonNode result = oneMapSearch(postalCode);
        if (result == null) return new double[]{0.0, 0.0};
        return new double[]{result.path("X").asDouble(), result.path("Y").asDouble()};
    }

    private String getAddressFromPostalCode(String postalCode) {
        JsonNode result = oneMapSearch(postalCode);
        return result == null ? "Address not found" : result.path("ROAD_NAME").asText();
    }

    public String getProjectNameFromPostalCode(String postalCode) {
        JsonNode result = oneMapSearch(postalCode);
        return result == null ? "Address not found" : result.path("BUILDING").asText();
    }

    public List<HDBRentalContract> getHDBRentalContracts(String postalCode, String noOfRoom) {
        return getHDBRentalContractsByFlatType(postalCode, noOfRoom + "-ROOM");
    }

    /**
     * Fetch HDB rental approvals on the same street as the postal code for a given
     * flat type ("2-ROOM" .. "5-ROOM", "EXECUTIVE").
     */
    public List<HDBRentalContract> getHDBRentalContractsByFlatType(String postalCode, String flattype) {
        return getHDBRentalContractsByStreet(normaliseHdbStreetName(getAddressFromPostalCode(postalCode)), flattype);
    }

    /** HDB rental approvals on a street, written in HDB's abbreviations ("TAMPINES ST 43"). */
    public List<HDBRentalContract> getHDBRentalContractsByStreet(String streetName, String flattype) {
        return fetchHdbRentals("{\"street_name\":\"" + streetName + "\", \"flat_type\":\"" + flattype + "\"}");
    }

    /** HDB rental approvals anywhere in an HDB town ("SENGKANG"), for streets with too few rentals. */
    public List<HDBRentalContract> getHDBRentalContractsByTown(String town, String flattype) {
        return fetchHdbRentals("{\"town\":\"" + town + "\", \"flat_type\":\"" + flattype + "\"}");
    }

    private static final String HDB_RENTALS_URL = "https://data.gov.sg/api/action/datastore_search?resource_id=d_c9f57187485a850908655db0e8cfe651"
            + "&filters={filter}&sort={sort}&limit=1000";
    /** HDB results are shared by the fair-price card and Price Insights for a few minutes. */
    private static final long HDB_CACHE_TTL_MILLIS = 10 * 60 * 1000L;
    private static final long DATAGOVSG_RETRY_WAIT_MILLIS = 10_000;
    private record CachedHdb(long fetchedAt, List<HDBRentalContract> contracts) {}
    private final Map<String, CachedHdb> hdbCache = new ConcurrentHashMap<>();

    /**
     * Query the HDB rental dataset newest first (the API returns oldest first by default, so a
     * plain capped query on a busy street would miss recent rentals). Results are cached briefly,
     * and a rate-limit reply is retried once after data.gov.sg's suggested wait.
     */
    private List<HDBRentalContract> fetchHdbRentals(String filter) {
        CachedHdb hit = hdbCache.get(filter);
        if (hit != null && System.currentTimeMillis() - hit.fetchedAt() < HDB_CACHE_TTL_MILLIS) {
            return new ArrayList<>(hit.contracts());
        }
        HttpHeaders headers = new HttpHeaders();
        // Optional data.gov.sg API key: requests without one get a lower rate limit.
        if (hasText(DATAGOVSG_API_KEY)) {
            headers.set("x-api-key", DATAGOVSG_API_KEY);
        }
        HttpEntity<String> entity = new HttpEntity<>(headers);

        for (int attempt = 1; attempt <= 2; attempt++) {
            String body;
            try {
                body = restTemplate.exchange(HDB_RENTALS_URL, HttpMethod.GET, entity, String.class,
                        filter, "rent_approval_date desc").getBody();
            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                body = "TOO_MANY_REQUESTS";
            }
            if (body != null && body.contains("TOO_MANY_REQUESTS")) {
                if (attempt == 2) throw new RuntimeException("data.gov.sg rate limit exceeded");
                logger.info("[data.gov.sg] Rate limited; retrying in {} ms", DATAGOVSG_RETRY_WAIT_MILLIS);
                try {
                    Thread.sleep(DATAGOVSG_RETRY_WAIT_MILLIS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting for data.gov.sg");
                }
                continue;
            }
            List<HDBRentalContract> contracts = parseHDBRentalContracts(body);
            contracts.sort((x, y) -> y.getRentApprovalDate().compareTo(x.getRentApprovalDate()));
            hdbCache.put(filter, new CachedHdb(System.currentTimeMillis(), contracts));
            return new ArrayList<>(contracts);
        }
        return new ArrayList<>();
    }

    /** HDB town names as used in the rental dataset. */
    private static final String[] HDB_TOWNS = {
        "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH", "BUKIT PANJANG", "BUKIT TIMAH",
        "CHOA CHU KANG", "CLEMENTI", "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG/WHAMPOA",
        "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG", "SENGKANG", "SERANGOON",
        "TAMPINES", "TOA PAYOH", "WOODLANDS", "YISHUN", "CENTRAL"
    };

    /** The HDB town named in a free-text location ("Sengkang", "Lorong 4 Toa Payoh"), or null. */
    public static String hdbTownIn(String location) {
        if (location == null) return null;
        String text = location.toUpperCase();
        for (String town : HDB_TOWNS) {
            if (town.equals("CENTRAL")) continue;
            if (text.contains(town) || (town.equals("KALLANG/WHAMPOA") && (text.contains("KALLANG") || text.contains("WHAMPOA")))) {
                return town;
            }
        }
        return null;
    }

    private static final String[][] HDB_STREET_ABBREVIATIONS = {
        {"AVENUE", "AVE"}, {"STREET", "ST"}, {"ROAD", "RD"}, {"DRIVE", "DR"}, {"CRESCENT", "CRES"},
        {"CENTRAL", "CTRL"}, {"NORTH", "NTH"}, {"SOUTH", "STH"}, {"JALAN", "JLN"}, {"LORONG", "LOR"},
        {"BUKIT", "BT"}, {"UPPER", "UPP"}, {"CLOSE", "CL"}, {"PLACE", "PL"}, {"HEIGHTS", "HTS"},
        {"TERRACE", "TER"}, {"GARDENS", "GDNS"}, {"PARK", "PK"}, {"KAMPONG", "KG"}, {"MARKET", "MKT"},
        {"TANJONG", "TG"}, {"COMMONWEALTH", "C'WEALTH"}, {"SAINT", "ST."}
    };

    /**
     * OneMap returns full road names ("TAMPINES STREET 21") while the HDB rental dataset
     * uses HDB's abbreviations ("TAMPINES ST 21"). Rewrite word by word.
     */
    public static String normaliseHdbStreetName(String roadName) {
        if (roadName == null) return null;
        String[] words = roadName.trim().toUpperCase().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String w : words) {
            String r = w;
            for (String[] pair : HDB_STREET_ABBREVIATIONS) {
                if (w.equals(pair[0])) { r = pair[1]; break; }
            }
            if (out.length() > 0) out.append(' ');
            out.append(r);
        }
        return out.toString();
    }

    // Parse rental contracts from JSON
    private List<HDBRentalContract> parseHDBRentalContracts(String jsonResponse) {
        List<HDBRentalContract> rentalContracts = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode resultNode = root.path("result");
            JsonNode recordsNode = resultNode.path("records");
            if (recordsNode.isArray()) {
                for (JsonNode contractNode : recordsNode) {
                    HDBRentalContract contract = new HDBRentalContract();
                    contract.setRentApprovalDate(contractNode.path("rent_approval_date").asText());
                    contract.setTown(contractNode.path("town").asText());
                    contract.setBlock(contractNode.path("block").asText());
                    contract.setStreetName(contractNode.path("street_name").asText());
                    contract.setFlatType(contractNode.path("flat_type").asText());
                    contract.setMonthlyRent(contractNode.path("monthly_rent").asInt());
                    rentalContracts.add(contract);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return rentalContracts;
    }

}
