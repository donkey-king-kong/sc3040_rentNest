package RentNest.RentNest;

import RentNest.controller.ListingsController;
import RentNest.dto.ListingsDTO;
import RentNest.model.Listings;
import RentNest.service.ListingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ListingControllerTest {

    @InjectMocks
    private ListingsController listingsController;

    @Mock
    private ListingsService listingsService;

    private ListingsDTO listingsDTO;
    private Listings listing;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);

        // Sample ListingDTO for testing
        listingsDTO = new ListingsDTO();
        listingsDTO.setListingID(1L);
        listingsDTO.setOwnerUserID(1L);
        listingsDTO.setName("Luxury Condo");
        listingsDTO.setType("Condo");
        listingsDTO.setBeds(3);
        listingsDTO.setBathroom(2);
        listingsDTO.setPrice(3500);

        // Sample Listing for testing
        listing = new Listings();
        listing.setListingID(1L);
        listing.setName("Luxury Condo");
        listing.setPrice(3500);
    }

    // Test for GET /api/listings (Retrieve all listings)
    @Test
    public void testGetAllListings() {
        List<Listings> listingsList = new ArrayList<>();
        listingsList.add(listing);

        when(listingsService.getAllListings()).thenReturn(listingsList);

        List<Listings> response = listingsController.getAllListings();

        assertEquals(1, response.size());
        verify(listingsService, times(1)).getAllListings();
    }

    // Test for GET /api/listings/{id} (Retrieve listing by ID)
    @Test
    public void testGetListingByIdSuccess() {
        when(listingsService.getListingById(1L)).thenReturn(Optional.of(listing));

        ResponseEntity<Listings> response = listingsController.getListingById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(listing, response.getBody());
        verify(listingsService, times(1)).getListingById(1L);
    }

    @Test
    public void testGetListingByIdNotFound() {
        when(listingsService.getListingById(1L)).thenReturn(Optional.empty());

        ResponseEntity<Listings> response = listingsController.getListingById(1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(listingsService, times(1)).getListingById(1L);
    }

    // Test for POST /api/listings (Create a new listing)
    @Test
    public void testCreateListingSuccess() {
        when(listingsService.saveListing(listingsDTO)).thenReturn(listing);

        ResponseEntity<?> response = listingsController.createListing(listingsDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(listing, response.getBody());
        verify(listingsService, times(1)).saveListing(listingsDTO);
    }

    @Test
    public void testCreateListingBadRequest() {
        when(listingsService.saveListing(listingsDTO)).thenThrow(new IllegalArgumentException("Invalid data"));

        ResponseEntity<?> response = listingsController.createListing(listingsDTO);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Invalid data", response.getBody());
        verify(listingsService, times(1)).saveListing(listingsDTO);
    }

    // Test for PUT /api/listings/{id} (Update a listing)
    @Test
    public void testUpdateListingSuccess() {
        when(listingsService.updateListing(1L, listingsDTO)).thenReturn(Optional.of(listing));

        ResponseEntity<Listings> response = listingsController.updateListing(1L, listingsDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(listing, response.getBody());
        verify(listingsService, times(1)).updateListing(1L, listingsDTO);
    }

    @Test
    public void testUpdateListingNotFound() {
        when(listingsService.updateListing(1L, listingsDTO)).thenReturn(Optional.empty());

        ResponseEntity<Listings> response = listingsController.updateListing(1L, listingsDTO);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(listingsService, times(1)).updateListing(1L, listingsDTO);
    }

    // Test for DELETE /api/listings/{id} (Delete a listing)
    @Test
    public void testDeleteListing() {
        doNothing().when(listingsService).deleteListing(1L);

        ResponseEntity<Void> response = listingsController.deleteListing(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(listingsService, times(1)).deleteListing(1L);
    }

    // Test for GET /api/listings/admin/flagged (Get flagged listings)
    @Test
    public void testGetFlaggedListings() {
        List<ListingsDTO> flaggedListings = new ArrayList<>();
        flaggedListings.add(listingsDTO);

        when(listingsService.getFlaggedListings()).thenReturn(flaggedListings);

        ResponseEntity<List<ListingsDTO>> response = listingsController.getFlaggedListings();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        verify(listingsService, times(1)).getFlaggedListings();
    }

    // Test for PUT /api/listings/setFlag/{listingID}/{flagValue} (Update listing flagged status)
    @Test
    public void testUpdateListingFlaggedSuccess() {
        when(listingsService.updateListingFlagged(1L, true)).thenReturn(Optional.of(listingsDTO));

        ResponseEntity<ListingsDTO> response = listingsController.updateListingFlagged(1L, true);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(listingsDTO, response.getBody());
        verify(listingsService, times(1)).updateListingFlagged(1L, true);
    }

    @Test
    public void testUpdateListingFlaggedNotFound() {
        when(listingsService.updateListingFlagged(1L, true)).thenReturn(Optional.empty());

        ResponseEntity<ListingsDTO> response = listingsController.updateListingFlagged(1L, true);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(listingsService, times(1)).updateListingFlagged(1L, true);
    }

    // Test for GET /api/listings/user/{userID}/listingIDs (Get listing IDs by userID)
    @Test
    public void testGetListingIDsByUserIDSuccess() {
        List<Long> listingIDs = new ArrayList<>();
        listingIDs.add(1L);

        when(listingsService.getListingIDsByUserID(1L)).thenReturn(listingIDs);

        ResponseEntity<?> response = listingsController.getListingIDsByUserID(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(listingIDs, response.getBody());
        verify(listingsService, times(1)).getListingIDsByUserID(1L);
    }

    @Test
    public void testGetListingIDsByUserIDNotFound() {
        when(listingsService.getListingIDsByUserID(1L)).thenReturn(new ArrayList<>());

        ResponseEntity<?> response = listingsController.getListingIDsByUserID(1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No listings found for user ID: 1", response.getBody());
        verify(listingsService, times(1)).getListingIDsByUserID(1L);
    }
}