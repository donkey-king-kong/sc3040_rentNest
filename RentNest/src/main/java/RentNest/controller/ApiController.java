package RentNest.controller;

import RentNest.model.api.*;
import RentNest.service.ApiService;
import RentNest.service.NearbyAmenitiesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gov")
public class ApiController {

    private final ApiService apiService;
    private final NearbyAmenitiesService nearbyAmenitiesService;

    @Autowired
    public ApiController(ApiService apiService, NearbyAmenitiesService nearbyAmenitiesService) {
        this.apiService = apiService;
        this.nearbyAmenitiesService = nearbyAmenitiesService;
    }

    @GetMapping("/schools/{listingId}")
    public List<School> getSchoolsByListingId(@PathVariable Long listingId) {
        return apiService.getSchoolsByListingId(listingId, 500);
    }

    @GetMapping("/hawkercentres/{listingId}")
    public List<HawkerCentre> getHawkerCentresByListingId(@PathVariable Long listingId) {
        return apiService.getHawkerCentresByListingId(listingId, 500);
    }

    @GetMapping("/busstops/{listingId}")
    public List<BusStop> getBusStopsByListingId(@PathVariable Long listingId) {
        return apiService.getBusStopsByListingId(listingId, 500);
    }

    @GetMapping("/nearby-amenities/{listingId}")
    public NearbyAmenitiesService.NearbyAmenitiesResponse getPrecomputedNearbyAmenities(@PathVariable Long listingId) {
        return nearbyAmenitiesService.getPrecomputedOrStart(listingId);
    }

    @PostMapping("/nearby-amenities/{listingId}/precompute")
    public void precomputeNearbyAmenities(@PathVariable Long listingId) {
        nearbyAmenitiesService.precomputeForListing(listingId);
    }

    @GetMapping("/rentalprices/{listingId}")
    public List<RentalPrices> getPastRentalPricesByListingId(@PathVariable Long listingId) {
        return apiService.getPastRentalPricesByListingId(listingId);
    }

    //years stand for data from number of years prior till now, up to 5.
    // landed property has "NA" for numberOfBedrooms
    @GetMapping("/privaterentalprices/postal/{postalCode}/{years}/{numberOfBedrooms}")
    public List<RentalContract> getRentalContractsByPostalCode(@PathVariable String postalCode, @PathVariable int years, @PathVariable String numberOfBedrooms) {
        return apiService.getRentalContractsNearPostalCode(postalCode, 300, years, numberOfBedrooms);
    }

    //years stand for data from number of years prior till now, up to 5.
    //projectname stands for condo name.
    // landed property has "NA" for numberOfBedrooms
    @GetMapping("/privaterentalprices/projectname/{projectname}/{years}/{numberOfBedrooms}")
    public List<RentalContract> getRentalContractsWithProject(@PathVariable String projectname, @PathVariable int years,@PathVariable String numberOfBedrooms) {
        return apiService.getRentalContractsByProject(projectname, years, numberOfBedrooms);
    }

    @GetMapping("/hdbrentalprices/{postalCode}/{numberOfBedrooms}")
    public List<HDBRentalContract> getHDBRentalContracts(@PathVariable String postalCode,@PathVariable String numberOfBedrooms) {
        return apiService.getHDBRentalContracts(postalCode,numberOfBedrooms);
    }
}
