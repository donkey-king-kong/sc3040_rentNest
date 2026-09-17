    package RentNest.controller;

    import RentNest.model.Listings;
    import RentNest.dto.ListingsDTO;
    import RentNest.service.ListingsService;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.*;


    import java.util.List;
    import java.util.Optional;

    @RestController
    @RequestMapping("/api/listings")
    public class ListingsController {

        private final ListingsService listingsService;

        @Autowired
        public ListingsController(ListingsService listingsService) {
            this.listingsService = listingsService;
        }

        // GET - Retrieve all listings
        @GetMapping
        public List<Listings> getAllListings() {
            return listingsService.getAllListings();
        }

        // GET - Retrieve a single listing by ID
        @GetMapping("/{id}")
        public ResponseEntity<Listings> getListingById(@PathVariable Long id) {
            Optional<Listings> listing = listingsService.getListingById(id);
            if (listing.isPresent()) {
                return ResponseEntity.ok(listing.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        }

        // POST - Create a new listing
        @PostMapping
        public ResponseEntity<?> createListing(@RequestBody ListingsDTO listingsDTO) {
            try {
                Listings createdListing = listingsService.saveListing(listingsDTO);
                return new ResponseEntity<>(createdListing, HttpStatus.CREATED);
            } catch (IllegalArgumentException e) {
                // Handle any illegal arguments passed to the service
                return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
            } catch (RuntimeException e) {
                // Handle general runtime exceptions such as user not found or other internal issues
                return new ResponseEntity<>("Error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            } catch (Exception e) {
                // Catch any other unexpected exceptions
                return new ResponseEntity<>("An unexpected error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }


        // PUT - Update an existing listing (delegates to service)
        @PutMapping("/{id}")
        public ResponseEntity<Listings> updateListing(@PathVariable Long id, @RequestBody ListingsDTO listingDTO) {
            Optional<Listings> updatedListing = listingsService.updateListing(id, listingDTO);
            if (updatedListing.isPresent()) {
                return ResponseEntity.ok(updatedListing.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        }


        // DELETE - Delete a listing by ID
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> deleteListing(@PathVariable Long id) {
            listingsService.deleteListing(id);
            return ResponseEntity.noContent().build();
        }

        // Get Flagged Listings
        @GetMapping("/admin/flagged")
            public ResponseEntity<List<ListingsDTO>> getFlaggedListings() {
            List<ListingsDTO> flaggedListings = listingsService.getFlaggedListings();
            return ResponseEntity.ok(flaggedListings);
        }

        // Update Flag
        @PutMapping("/setFlag/{listingID}/{flagValue}")
        public ResponseEntity<ListingsDTO> updateListingFlagged(@PathVariable Long listingID, @PathVariable boolean flagValue) {
            Optional<ListingsDTO> updatedListing = listingsService.updateListingFlagged(listingID, flagValue);

            return updatedListing.isPresent() ?
                ResponseEntity.ok(updatedListing.get()) :
                ResponseEntity.notFound().build();
        }


        // GET - Retrieve a list of listings that match the search terms provided
        @GetMapping("/search") // localhost:8080/api/listings/search?name=condo&beds=3
        public ResponseEntity<List<ListingsDTO>> searchListings(
                @RequestParam(required = false)String term,
                @RequestParam(required = false) Integer postal,
                @RequestParam(required = false) Integer minPrice,
                @RequestParam(required = false) Integer maxPrice,
                @RequestParam(required = false) Integer minSize,
                @RequestParam(required = false) Integer maxSize,
                @RequestParam(required = false) Integer beds,
                @RequestParam(required = false) Integer bathroom) {
            List<ListingsDTO> results = listingsService.searchListings(term, postal, minPrice, maxPrice, minSize, maxSize, beds, bathroom);
            return ResponseEntity.ok(results);
        }

        // GET - Retrieve listing IDs by user ID
        // Make sure it's an existing userID
        @GetMapping("/user/{userID}/listingIDs")
        public ResponseEntity<?> getListingIDsByUserID(@PathVariable Long userID) {
            try {
                List<Long> listingIDs = listingsService.getListingIDsByUserID(userID);

                // Check if the listing IDs list is empty, return NOT_FOUND with appropriate message
                if (listingIDs.isEmpty()) {
                    return new ResponseEntity<>("No listings found for user ID: " + userID, HttpStatus.NOT_FOUND);
                }

                // Return the list of listing IDs if available
                return ResponseEntity.ok(listingIDs);

            } catch (IllegalArgumentException e) {
                // If there is an IllegalArgumentException thrown from the service layer, respond with BAD_REQUEST
                return new ResponseEntity<>("Invalid UserID: " + e.getMessage(), HttpStatus.BAD_REQUEST);

            } catch (RuntimeException e) {
                // Handle general runtime errors more gracefully
                return new ResponseEntity<>("Error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }