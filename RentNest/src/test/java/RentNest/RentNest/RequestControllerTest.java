package RentNest.RentNest;


import RentNest.controller.RequestsController;
import RentNest.dto.RequestsDTO;
import RentNest.model.Requests;
import RentNest.service.RequestsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
class RequestControllerTest {

    @Mock
    private RequestsService requestsService;

    @InjectMocks
    private RequestsController requestsController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreateRequest() {
        RequestsDTO requestsDTO = new RequestsDTO();
        Requests createdRequest = new Requests();
        when(requestsService.createRequest(requestsDTO)).thenReturn(createdRequest);

        ResponseEntity<Requests> response = requestsController.createRequest(requestsDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(createdRequest, response.getBody());
        verify(requestsService, times(1)).createRequest(requestsDTO);
    }

    @Test
    void testGetAllRequests() {
        List<Requests> requestsList = new ArrayList<>();
        when(requestsService.getAllRequests()).thenReturn(requestsList);

        ResponseEntity<List<Requests>> response = requestsController.getAllRequests();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(requestsList, response.getBody());
        verify(requestsService, times(1)).getAllRequests();
    }

    @Test
    void testGetRequestById_Success() {
        Long requestId = 1L;
        Requests request = new Requests();
        when(requestsService.getRequestById(requestId)).thenReturn(Optional.of(request));

        ResponseEntity<Requests> response = requestsController.getRequestById(requestId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(request, response.getBody());
        verify(requestsService, times(1)).getRequestById(requestId);
    }

    @Test
    void testGetRequestById_NotFound() {
        Long requestId = 1L;
        when(requestsService.getRequestById(requestId)).thenReturn(Optional.empty());

        try {
            requestsController.getRequestById(requestId);
        } catch (RuntimeException e) {
            assertEquals("Request not found with ID: " + requestId, e.getMessage());
        }

        verify(requestsService, times(1)).getRequestById(requestId);
    }

    @Test
    void testUpdateRequest() {
        Long requestId = 1L;
        RequestsDTO requestsDTO = new RequestsDTO();
        Requests updatedRequest = new Requests();
        when(requestsService.updateRequest(requestId, requestsDTO)).thenReturn(updatedRequest);

        ResponseEntity<Requests> response = requestsController.updateRequest(requestId, requestsDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updatedRequest, response.getBody());
        verify(requestsService, times(1)).updateRequest(requestId, requestsDTO);
    }

    @Test
    void testDeleteRequest() {
        Long requestId = 1L;

        doNothing().when(requestsService).deleteRequest(requestId);

        ResponseEntity<Void> response = requestsController.deleteRequest(requestId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(requestsService, times(1)).deleteRequest(requestId);
    }

    @Test
    void testMakeTerminationRequest_Success() {
        Long rentalId = 1L;
        long refundAmount = 1000L;

        doNothing().when(requestsService).makeTerminationRequest(rentalId, refundAmount);

        ResponseEntity<String> response = requestsController.makeTerminationRequest(rentalId, refundAmount);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("Request and Chat History created successfully", response.getBody());
        verify(requestsService, times(1)).makeTerminationRequest(rentalId, refundAmount);
    }

    @Test
    void testMakeTerminationRequest_Failure() {
        Long rentalId = 1L;
        long refundAmount = 1000L;
        String errorMessage = "Failed to process request";

        doThrow(new RuntimeException(errorMessage)).when(requestsService).makeTerminationRequest(rentalId, refundAmount);

        ResponseEntity<String> response = requestsController.makeTerminationRequest(rentalId, refundAmount);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Error: " + errorMessage, response.getBody());
        verify(requestsService, times(1)).makeTerminationRequest(rentalId, refundAmount);
    }
}
