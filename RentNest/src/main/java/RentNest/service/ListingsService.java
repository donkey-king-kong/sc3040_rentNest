package RentNest.service;

import RentNest.dto.ListingsDTO;
import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import RentNest.model.User;
import RentNest.dto.UserDTO;
import RentNest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.stream.Collectors;
import java.util.List;

@Service
public class ListingsService {

    private final ListingsRepository listingsRepository;
    private final UserRepository userRepository;

    // Mapping Listings to ListingsDTO
    public ListingsDTO toListingsDTO(Listings listings) {
        ListingsDTO listingsDTO = new ListingsDTO();

        // Map basic fields
        listingsDTO.setListingID(listings.getListingID());
        listingsDTO.setName(listings.getName());
        listingsDTO.setType(listings.getType());
        listingsDTO.setFloor(listings.getFloor());
        listingsDTO.setUnitNumber(listings.getUnitNumber());
        listingsDTO.setLocation(listings.getLocation());
        listingsDTO.setPostal(listings.getPostal());
        listingsDTO.setPrice(listings.getPrice());
        listingsDTO.setSize(listings.getSize());
        listingsDTO.setBeds(listings.getBeds());
        listingsDTO.setBathroom(listings.getBathroom());
        listingsDTO.setDescription(listings.getDescription());
        listingsDTO.setFlagged(listings.isFlagged());
        listingsDTO.setOwnerPhotoURL(listings.getOwnerPhotoURL());
        listingsDTO.setOwnerName(listings.getOwnerName());
        
        // Map the foreign key relationship (Owner to UserDTO)
        UserDTO userDTO = new UserDTO();
        userDTO.setUserId(listings.getOwner().getUserID());

        listingsDTO.setOwnerUserID(userDTO.getUserId());

        return listingsDTO;
    }

    @Autowired
    public ListingsService(ListingsRepository listingsRepository, UserRepository userRepository) {
        this.listingsRepository = listingsRepository;
        this.userRepository = userRepository;
    }

    // Retrieve all listings
    public List<Listings> getAllListings() {
        return listingsRepository.findAll();
    }

    // Retrieve a listing by its ID
    public Optional<Listings> getListingById(Long id) {
        return listingsRepository.findById(id);
    }

    public int getPostalByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getPostal)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    public int getBedsByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getBeds)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    public String getTypeByListingId(Long id) {
        return listingsRepository.findById(id)
                .map(Listings::getType)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with id: " + id));
    }

    // Save or create a listing
    public Listings saveListing(ListingsDTO listingDTO) {
        // Fetch the owner by userID from the UserRepository
        User owner = userRepository.findById(listingDTO.getOwnerUserID())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Create new listing entry
        Listings listing = new Listings();
        listing.setName(listingDTO.getName());
        listing.setType(listingDTO.getType());
        listing.setFloor(listingDTO.getFloor());
        listing.setUnitNumber(listingDTO.getUnitNumber());
        listing.setLocation(listingDTO.getLocation());
        listing.setPostal(listingDTO.getPostal());
        listing.setPrice(listingDTO.getPrice());
        listing.setSize(listingDTO.getSize());
        listing.setBeds(listingDTO.getBeds());
        listing.setBathroom(listingDTO.getBathroom());
        listing.setDescription(listingDTO.getDescription());
        listing.setTenant(null);
        listing.setOwner(owner);
        listing.setListingpicture(listingDTO.getListingpicture());

        return listingsRepository.save(listing);
    }
//    Example:
//    {
//            "ownerUserID": 4,         // Foreign Key to Owner
//            "tenantUserID": null,      // Foreign Key to Tenant (can be null initially)
//            "name": "Luxury Condo",
//            "type": "Condo",
//            "floor": 15,
//            "unitNumber": "15A",
//            "location": "123 Main Street, Downtown",
//            "postal": 123456,
//            "price": 3500,
//            "size": 1200,
//            "beds": 3,
//            "bathroom": 2,
//            "description": "Spacious 3-bedroom condo with a great view of the city.",
//            "flagged": false
//    }

    // Update the listing using ListingsDTO
    public Optional<Listings> updateListing(Long id, ListingsDTO listingDTO) {
        // Find the existing listing by ID
        Optional<Listings> listingOptional = listingsRepository.findById(id);

        if (listingOptional.isPresent()) {
            Listings listing = listingOptional.get();

            // Map fields from ListingsDTO to Listings entity
            listing.setName(listingDTO.getName());
            listing.setType(listingDTO.getType());
            listing.setFloor(listingDTO.getFloor());
            listing.setUnitNumber(listingDTO.getUnitNumber());
            listing.setLocation(listingDTO.getLocation());
            listing.setPostal(listingDTO.getPostal());
            listing.setPrice(listingDTO.getPrice());
            listing.setSize(listingDTO.getSize());
            listing.setBeds(listingDTO.getBeds());
            listing.setBathroom(listingDTO.getBathroom());
            listing.setDescription(listingDTO.getDescription());
            listing.setListingpicture(listingDTO.getListingpicture());

            // Update owner if necessary (optional, based on your use case)
            if (listingDTO.getOwnerUserID() != null) {
                User owner = userRepository.findById(listingDTO.getOwnerUserID())
                        .orElseThrow(() -> new RuntimeException("Owner not found"));
                listing.setOwner(owner);
            }

            // Save the updated listing back to the repository
            listingsRepository.save(listing);
            return Optional.of(listing);
        } else {
            return Optional.empty();  // If no listing is found, return empty
        }
    }


    // Delete a listing by its ID
    public void deleteListing(Long id) {
        listingsRepository.deleteById(id);
    }

    //Get Flagged Listings
    public List<ListingsDTO> getFlaggedListings() {
        List<Listings> flaggedListings = listingsRepository.findByFlaggedTrue();
        return flaggedListings.stream()
                .map(this::toListingsDTO)
                .collect(Collectors.toList());
    }

    //Update Flag
    public Optional<ListingsDTO> updateListingFlagged(Long listingID, boolean flagValue) {
        // Find the listing by ID
        Optional<Listings> listingOptional = listingsRepository.findById(listingID);

        // If listing exists, update the flagged field and save
        if (listingOptional.isPresent()) {
            Listings listing = listingOptional.get();
            listing.setFlagged(flagValue);  // Set flagged to the desired value (true or false)
            listingsRepository.save(listing);  // Save the updated listing
            return Optional.of(toListingsDTO(listing));
        }

        // Return empty if the listing was not found
        return Optional.empty();
    }

    public List<ListingsDTO> searchListings(String term,
                                            Integer postal,
                                            Integer minPrice,
                                            Integer maxPrice,
                                            Integer minSize,
                                            Integer maxSize,
                                            Integer beds,
                                            Integer bathroom) {
        List<Listings> listings = listingsRepository.searchListings(term, postal, minPrice, maxPrice, minSize, maxSize, beds, bathroom);
        return listings.stream().map(this::toListingsDTO).collect(Collectors.toList());
    }

    //Get listings by UserID
    public List<ListingsDTO> getListingsByUserID(Long userID) {
        // Find the listings by userID
        List<Listings> listings = listingsRepository.findByOwnerUserIDOrTenantUserID(userID, userID);

        // Map each Listing to a ListingDTO
        return listings.stream().map(this::toListingsDTO).collect(Collectors.toList());
    }

    // Get listing IDs by UserID
    // Do not confuse with getListingsByUserID
    public List<Long> getListingIDsByUserID(Long userID) {
        try {
            // Find listings by userID (either owner or tenant)
            List<Listings> listings = listingsRepository.findByOwnerUserIDOrTenantUserID(userID, userID);

            // If no listings found, throw an exception
            if (listings.isEmpty()) {
                throw new IllegalArgumentException("No listings found for the given user ID: " + userID);
            }

            // Map each Listing to its ID
            return listings.stream().map(Listings::getListingID).collect(Collectors.toList());

        } catch (Exception e) {
            // Log the error message for debugging (you can replace this with a logging framework if needed)
            System.out.println("Error while fetching listing IDs by userID: " + e.getMessage());
            throw e; // Rethrow the exception to ensure it's handled properly by the controller
        }
    }

    // Find a listing by ownerId and tenantId
    public Optional<ListingsDTO> findListingByOwnerAndTenant(Long ownerId, Long tenantId) {
        return listingsRepository.findByOwnerUserIDAndTenantUserID(ownerId, tenantId)
                .map(this::toListingsDTO);  // Map to ListingsDTO if found
    }
}