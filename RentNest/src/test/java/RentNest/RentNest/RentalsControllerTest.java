package RentNest.RentNest;
import RentNest.controller.RentalsController;
import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RentalsDTO;
import RentNest.model.Rentals;
import RentNest.service.RentalsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.text.SimpleDateFormat;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class RentalsControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RentalsService rentalsService;

    @InjectMocks
    private RentalsController rentalsController;

    private ObjectMapper objectMapper;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(rentalsController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    public void createRental_ShouldReturnCreatedRental() throws Exception {
        RentalsDTO rentalDTO = new RentalsDTO();
        // Set properties for rentalDTO
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

        rentalDTO.setTenantUserID(12345L);
        rentalDTO.setRentalPrice(2000L);
        rentalDTO.setDepositPrice(3000L);
        rentalDTO.setRentalDate(dateFormat.parse("2024-9-30"));
        rentalDTO.setPaymentHistory("First payment made on 2024-09-30");
        rentalDTO.setStatus("active");

        Rentals createdRental = new Rentals();
        createdRental.setRentalID(1L);
        // Set other properties as needed

        when(rentalsService.createRental(any(RentalsDTO.class))).thenReturn(createdRental);

        ResponseEntity<?> response = rentalsController.createRental(rentalDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(createdRental, response.getBody());
    }

    @Test
    public void getAllRentals_ShouldReturnAllRentals() {
        Rentals rental = new Rentals();
        rental.setRentalID(1L);
        // Set other properties as needed

        when(rentalsService.getAllRentals()).thenReturn(Collections.singletonList(rental));

        ResponseEntity<List<Rentals>> response = rentalsController.getAllRentals();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    public void getRentalById_ShouldReturnRental() {
        Long rentalID = 1L;
        Rentals rental = new Rentals();
        rental.setRentalID(rentalID);
        // Set other properties as needed

        when(rentalsService.getRentalById(rentalID)).thenReturn(Optional.of(rental));

        ResponseEntity<Rentals> response = rentalsController.getRentalById(rentalID);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(rental, response.getBody());
    }

    @Test
    public void getRentalById_ShouldReturnNotFound() {
        Long rentalID = 1L;

        when(rentalsService.getRentalById(rentalID)).thenReturn(Optional.empty());

        ResponseEntity<Rentals> response = rentalsController.getRentalById(rentalID);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void updateRental_ShouldReturnUpdatedRental() {
        Long rentalID = 1L;
        RentalsDTO updatedRentalDTO = new RentalsDTO();
        // Set properties for updatedRentalDTO

        Rentals updatedRental = new Rentals();
        updatedRental.setRentalID(rentalID);
        // Set other properties as needed

        when(rentalsService.updateRental(eq(rentalID), any(RentalsDTO.class))).thenReturn(updatedRental);

        ResponseEntity<Rentals> response = rentalsController.updateRental(rentalID, updatedRentalDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updatedRental, response.getBody());
    }

    @Test
    public void updateRental_ShouldReturnNotFound() {
        Long rentalID = 1L;
        RentalsDTO updatedRentalDTO = new RentalsDTO();

        when(rentalsService.updateRental(eq(rentalID), any(RentalsDTO.class))).thenReturn(null);

        ResponseEntity<Rentals> response = rentalsController.updateRental(rentalID, updatedRentalDTO);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void deleteRental_ShouldReturnNoContent() {
        Long rentalID = 1L;

        ResponseEntity<Void> response = rentalsController.deleteRental(rentalID);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(rentalsService).deleteRental(rentalID);
    }

    @Test
    public void reviewRentalOffer_ShouldReturnReviewedRental() {
        Long rentalID = 1L;
        RentalsDTO updatedRentalDTO = new RentalsDTO();
        // Set properties for updatedRentalDTO

        Rentals reviewedRental = new Rentals();
        reviewedRental.setRentalID(rentalID);
        // Set other properties as needed

        when(rentalsService.reviewRentalOffer(eq(rentalID), any(RentalsDTO.class))).thenReturn(reviewedRental);

        ResponseEntity<?> response = rentalsController.reviewRentalOffer(rentalID, updatedRentalDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(reviewedRental, response.getBody());
    }

    @Test
    public void manageTenants_ShouldReturnTenantIDs() {
        Long listingID = 1L;
        List<Long> tenantIDs = List.of(2L, 3L);

        when(rentalsService.manageTenants(listingID)).thenReturn(tenantIDs);

        ResponseEntity<?> response = rentalsController.manageTenants(listingID);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(tenantIDs, response.getBody());
    }

    @Test
    public void manageTenants_ShouldReturnNoContent() {
        Long listingID = 1L;
        List<Long> tenantIDs = Collections.emptyList();

        when(rentalsService.manageTenants(listingID)).thenReturn(tenantIDs);

        ResponseEntity<?> response = rentalsController.manageTenants(listingID);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals("No tenants found for the specified listing.", response.getBody());
    }
}