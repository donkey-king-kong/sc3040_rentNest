package RentNest.service;

import RentNest.model.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
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


@Service
public class ApiService {

    private RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ListingsService listingsService;

    public List<School> getSchoolsByListingId(Long listingId, double radiusMeters) {
        String postalCode = Integer.toString(listingsService.getPostalByListingId(listingId));
        return getSchoolsNearPostalCode(postalCode,radiusMeters);
    }

    public List<School> getSchoolsNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from postal code using OneMap API
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        double postalLatitude = postalCoordinates[0];
        double postalLongitude = postalCoordinates[1];
        
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
            double schoolLatitude = schoolCoordinates[0];
            school.setLatitude(schoolLatitude);
            double schoolLongitude = schoolCoordinates[1];
            school.setLongitude(schoolLongitude);
            double distance = calculateDistance(postalLatitude, postalLongitude, schoolLatitude, schoolLongitude);
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
        String postalCode = Integer.toString(listingsService.getPostalByListingId(listingId));
        return getHawkerCentresNearPostalCode(postalCode,radiusMeters);
    }

    public List<HawkerCentre> getHawkerCentresNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from postal code using OneMap API
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        double postalLatitude = postalCoordinates[0];
        double postalLongitude = postalCoordinates[1];
        
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
                double hawkerLatitude = hawkerCoordinates[0];
                hawkerCentre.setLatitude(hawkerLatitude);
                double hawkerLongitude = hawkerCoordinates[1];
                hawkerCentre.setLongitude(hawkerLongitude);
                double distance = calculateDistance(postalLatitude, postalLongitude, hawkerLatitude, hawkerLongitude);
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
        String postalCode = Integer.toString(listingsService.getPostalByListingId(listingId));
        return getBusStopsNearPostalCode(postalCode,radiusMeters);
    }

    public List<BusStop> getBusStopsNearPostalCode(String postalCode, double radiusMeters) {
        // Get latitude and longitude from postal code using OneMap API
        double[] postalCoordinates = getCoordinatesFromPostalCode(postalCode);
        double postalLatitude = postalCoordinates[0];
        double postalLongitude = postalCoordinates[1];

        List<BusStop> busStops = new ArrayList<>();
        int skip = 0;
        boolean hasMoreData = true;

        // Retrieve all bus stops using $skip parameter
        while (hasMoreData) {
            String url = "https://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip=" + skip;
            HttpHeaders headers = new HttpHeaders();
            headers.set("AccountKey", LTADATAMALL_ACCOUNTKEY);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            List<BusStop> partialBusStops = parseBusStops(response.getBody());
            if (partialBusStops.isEmpty()) {
                hasMoreData = false;
            } else {
                busStops.addAll(partialBusStops);
                skip += 500;
            }
        }
        
        // Filter bus stops within radius
        List<BusStop> nearbyBusStops = new ArrayList<>();
        for (BusStop busStop : busStops) {
            double distance = calculateDistance(postalLatitude, postalLongitude, busStop.getLatitude(), busStop.getLongitude());
            if (distance <= radiusMeters) {
                nearbyBusStops.add(busStop);
            }
        }
        
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

    // Function to get latitude and longitude from postal code using OneMap API
    private double[] getCoordinatesFromPostalCode(String postalCode) {
        String geocodeUrl = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=" + postalCode + "&returnGeom=Y&getAddrDetails=N";
        ResponseEntity<String> response = restTemplate.exchange(geocodeUrl, HttpMethod.GET, null, String.class);
        double latitude = parseLatitude(response.getBody());
        double longitude = parseLongitude(response.getBody());
        return new double[]{latitude, longitude};
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

    public List<RentalPrices> getPastRentalPricesByListingId(Long listingId) {
        String noOfRoom = Integer.toString(listingsService.getBedsByListingId(listingId));
        List<RentalPrices> rentalPrices;
        String postalCode = Integer.toString(listingsService.getPostalByListingId(listingId));
        String buildingName = getProjectNameFromPostalCode(postalCode);
        if (listingsService.getTypeByListingId(listingId).equals("HDB")) {
            rentalPrices = getHDBRentalContracts(postalCode, noOfRoom).stream()
                    .map(contract -> new RentalPrices(formatDate(contract.getRentApprovalDate()), contract.getMonthlyRent()))
                    .collect(Collectors.toList());
        } else {
            rentalPrices = getRentalContractsByProject(buildingName, 5, noOfRoom).stream()
                    .map(contract -> new RentalPrices(formatDate(contract.getLeaseDate()), contract.getRent()))
                    .collect(Collectors.toList());
        }
        return rentalPrices;
    }

    private String formatDate(String dateStr) {
    try {
        SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM");
        Date date = inputFormat.parse(dateStr);
        SimpleDateFormat outputFormat = new SimpleDateFormat("MMM yyyy");
        return outputFormat.format(date);
    } catch (ParseException e) {
        e.printStackTrace();
        return dateStr;
        }
    }   


    public List<RentalContract> getRentalContractsNearPostalCode(String postalCode, double radiusMeters, int years, String noOfBedRoom) {
        // Get x and y coordinates from postal code using OneMap API
        double[] postalCoordinates = getXYCoordinatesFromPostalCode(postalCode);
        double postalX = postalCoordinates[0];
        double postalY = postalCoordinates[1];
    
        List<String> refPeriods = getRefPeriodsForPastYears(years);
        List<RentalContract> allRentalContracts = new ArrayList<>();
    
        // Generate Daily Token
        String tokenUrl = "https://www.ura.gov.sg/uraDataService/insertNewToken.action";
        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.set("AccessKey", URA_ACCESSKEY);
        ResponseEntity<String> tokenResponse = restTemplate.exchange(tokenUrl, HttpMethod.GET, new org.springframework.http.HttpEntity<>(tokenHeaders), String.class);
        String dailyToken = extractToken(tokenResponse.getBody());
    
        for (String refPeriod : refPeriods) {
            // Get Rental Prices
            String rentalUrl = "https://www.ura.gov.sg/uraDataService/invokeUraDS?service=PMI_Resi_Rental&refPeriod=" + refPeriod;
            HttpHeaders rentalHeaders = new HttpHeaders();
            rentalHeaders.set("AccessKey", URA_ACCESSKEY);
            rentalHeaders.set("Token", dailyToken);
            ResponseEntity<String> rentalResponse = restTemplate.exchange(rentalUrl, HttpMethod.GET, new HttpEntity<>(rentalHeaders), String.class);
    
            List<RentalContract> rentalContracts = parseRentalContracts(rentalResponse.getBody());
            allRentalContracts.addAll(rentalContracts);
        }
    
        // Filter rental contracts within x and y range
        List<RentalContract> nearbyRentalContracts = new ArrayList<>();
        for (RentalContract rentalContract : allRentalContracts) {
            double propertyX = rentalContract.getX();
            double propertyY = rentalContract.getY();
            if (isWithinRange(postalX, postalY, propertyX, propertyY, radiusMeters)) {
                if (rentalContract.getNoOfBedRoom().equals(noOfBedRoom)) {
                    nearbyRentalContracts.add(rentalContract);
                }
            }
        }
    
        nearbyRentalContracts.sort((a, b) -> b.getLeaseDate().compareTo(a.getLeaseDate()));
        return nearbyRentalContracts;
    }

    public List<RentalContract> getRentalContractsByProject(String projectName, int years, String noOfBedRoom) {
        List<String> refPeriods = getRefPeriodsForPastYears(years);
        List<RentalContract> allRentalContracts = new ArrayList<>();
    
        // Generate Daily Token
        String tokenUrl = "https://www.ura.gov.sg/uraDataService/insertNewToken.action";
        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.set("AccessKey", URA_ACCESSKEY);
        ResponseEntity<String> tokenResponse = restTemplate.exchange(tokenUrl, HttpMethod.GET, new org.springframework.http.HttpEntity<>(tokenHeaders), String.class);
        String dailyToken = extractToken(tokenResponse.getBody());
    
        for (String refPeriod : refPeriods) {
            // Get Rental Prices
            String rentalUrl = "https://www.ura.gov.sg/uraDataService/invokeUraDS?service=PMI_Resi_Rental&refPeriod=" + refPeriod;
            HttpHeaders rentalHeaders = new HttpHeaders();
            rentalHeaders.set("AccessKey", URA_ACCESSKEY);
            rentalHeaders.set("Token", dailyToken);
            ResponseEntity<String> rentalResponse = restTemplate.exchange(rentalUrl, HttpMethod.GET, new HttpEntity<>(rentalHeaders), String.class);
    
            List<RentalContract> rentalContracts = parseRentalContracts(rentalResponse.getBody());
            allRentalContracts.addAll(rentalContracts);
        }
    
        // Filter rental contracts by project name and noOfBedRoom
        List<RentalContract> filteredRentalContracts = new ArrayList<>();
        for (RentalContract rentalContract : allRentalContracts) {
            if (rentalContract.getProject().equalsIgnoreCase(projectName)) {
                if (rentalContract.getNoOfBedRoom().equals(noOfBedRoom)) {
                    filteredRentalContracts.add(rentalContract);
                }
            }
        }
    
        filteredRentalContracts.sort((a, b) -> b.getLeaseDate().compareTo(a.getLeaseDate()));
        return filteredRentalContracts;
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
                            RentalContract rentalContract = new RentalContract();
                            rentalContract.setAreaSqm(rentalNode.path("areaSqm").asText());
                            String leaseDate = rentalNode.path("leaseDate").asText();
                            String month = leaseDate.substring(0, 2);
                            String year = "20" + leaseDate.substring(2);
                            rentalContract.setLeaseDate(year + "-" + month);
                            rentalContract.setPropertyType(rentalNode.path("propertyType").asText());
                            rentalContract.setDistrict(rentalNode.path("district").asText());
                            rentalContract.setAreaSqft(rentalNode.path("areaSqft").asText());
                            rentalContract.setNoOfBedRoom(rentalNode.path("noOfBedRoom").asText());
                            rentalContract.setRent(rentalNode.path("rent").asInt());
                            rentalContract.setX(propertyNode.path("x").asDouble());
                            rentalContract.setY(propertyNode.path("y").asDouble());
                            rentalContract.setProject(propertyNode.path("project").asText());
                            rentalContracts.add(rentalContract);
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return rentalContracts;
    }

    private String extractToken(String response) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
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

    private double[] getXYCoordinatesFromPostalCode(String postalCode) {
        String geocodeUrl = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=" + postalCode + "&returnGeom=Y&getAddrDetails=N";
        ResponseEntity<String> response = restTemplate.exchange(geocodeUrl, HttpMethod.GET, null, String.class);
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray() && resultsNode.size() > 0) {
                double x = resultsNode.get(0).path("X").asDouble();
                double y = resultsNode.get(0).path("Y").asDouble();
                return new double[]{x, y};
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return new double[]{0.0, 0.0};
    }

    private String getAddressFromPostalCode(String postalCode) {
        String geocodeUrl = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=" + postalCode + "&returnGeom=N&getAddrDetails=Y";
        ResponseEntity<String> response = restTemplate.exchange(geocodeUrl, HttpMethod.GET, null, String.class);
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray() && resultsNode.size() > 0) {
                String address = resultsNode.get(0).path("ROAD_NAME").asText();
                return address;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return "Address not found";
    }

    private String getProjectNameFromPostalCode(String postalCode) {
        String geocodeUrl = "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=" + postalCode + "&returnGeom=N&getAddrDetails=Y";
        ResponseEntity<String> response = restTemplate.exchange(geocodeUrl, HttpMethod.GET, null, String.class);
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode resultsNode = root.path("results");
            if (resultsNode.isArray() && resultsNode.size() > 0) {
                String address = resultsNode.get(0).path("BUILDING").asText();
                return address;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return "Address not found";
    }

    public List<HDBRentalContract> getHDBRentalContracts(String postalCode, String noOfRoom) {
        String streetName = getAddressFromPostalCode(postalCode);
        if (streetName != null && streetName.contains("AVENUE")) {
            streetName = streetName.replace("AVENUE", "AVE");
        }
        String flattype = noOfRoom + "-ROOM";
        String url = "https://data.gov.sg/api/action/datastore_search?resource_id=d_c9f57187485a850908655db0e8cfe651"
                     + "&filters={filter}&limit=1000";

        String filter = "{\"street_name\":\"" + streetName + "\", \"flat_type\":\"" + flattype + "\"}";
        // You can set headers if necessary
        HttpHeaders headers = new HttpHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class,filter);
        List<HDBRentalContract> rentalContracts = parseHDBRentalContracts(response.getBody());
        rentalContracts.sort((a, b) -> b.getRentApprovalDate().compareTo(a.getRentApprovalDate()));
        return rentalContracts;
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
