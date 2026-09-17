package RentNest.RentNest;

import RentNest.controller.PaymentController;
import RentNest.dto.PaymentDTO;
import RentNest.model.Payment;
import RentNest.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class PaymentControllerTest {

    @InjectMocks
    private PaymentController paymentController;

    @Mock
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreatePayment() {
        PaymentDTO paymentDTO = new PaymentDTO();
        paymentDTO.setRentalID(1L);
        paymentDTO.setAmount(1000);
        paymentDTO.setDate(new Date());

        Payment createdPayment = new Payment();
        createdPayment.setPaymentId(1L);
        createdPayment.setAmount(1000L);
        createdPayment.setDate(new Date());

        when(paymentService.createPayment(any(PaymentDTO.class))).thenReturn(createdPayment);

        ResponseEntity<Payment> response = paymentController.payment(paymentDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(createdPayment, response.getBody());
    }

    @Test
    void testGetPaymentByID() {
        Payment payment = new Payment();
        payment.setPaymentId(1L);
        payment.setAmount(1000L);
        payment.setDate(new Date());

        when(paymentService.getPaymentID(1L)).thenReturn(Optional.of(payment));

        ResponseEntity<Payment> response = paymentController.getPaymentByID(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(payment, response.getBody());
    }

    @Test
    void testGetPaymentByID_NotFound() {
        when(paymentService.getPaymentID(1L)).thenReturn(Optional.empty());

        ResponseEntity<Payment> response = paymentController.getPaymentByID(1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testGetAllPayments() {
        Payment payment1 = new Payment();
        payment1.setPaymentId(1L);
        Payment payment2 = new Payment();
        payment2.setPaymentId(2L);

        when(paymentService.getAllPayment()).thenReturn(Arrays.asList(payment1, payment2));

        List<Payment> response = paymentController.getAllPayments();

        assertEquals(2, response.size());
    }

    @Test
    void testUpdatePayment() {
        PaymentDTO paymentDTO = new PaymentDTO();
        paymentDTO.setRentalID(1L);
        paymentDTO.setAmount(1500);
        paymentDTO.setDate(new Date());

        Payment updatedPayment = new Payment();
        updatedPayment.setPaymentId(1L);
        updatedPayment.setAmount(1500L);
        updatedPayment.setDate(new Date());

        when(paymentService.updatePayment(anyLong(), any(PaymentDTO.class))).thenReturn(updatedPayment);

        ResponseEntity<Payment> response = paymentController.updatePayment(1L, paymentDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updatedPayment, response.getBody());
    }

    @Test
    void testDeletePayment() {
        doNothing().when(paymentService).deletePayment(1L);

        ResponseEntity<Payment> response = paymentController.deletePayment(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
    }

    @Test
    void testMakeMonthlyPayment() {
        PaymentDTO paymentDTO = new PaymentDTO();
        paymentDTO.setRentalID(1L);
        paymentDTO.setAmount(1000);
        paymentDTO.setDate(new Date());

        when(paymentService.makeMonthlyPayment(any(PaymentDTO.class))).thenReturn(true);

        ResponseEntity<String> response = paymentController.makeMonthlyPayment(paymentDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Monthly payment made.", response.getBody());
    }

    @Test
    void testMakeMonthlyPayment_Failure() {
        PaymentDTO paymentDTO = new PaymentDTO();
        paymentDTO.setRentalID(1L);
        paymentDTO.setAmount(1000);
        paymentDTO.setDate(new Date());

        when(paymentService.makeMonthlyPayment(any(PaymentDTO.class))).thenReturn(false);

        ResponseEntity<String> response = paymentController.makeMonthlyPayment(paymentDTO);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Failed to make monthly payment. Ensure rentalID exists and amount is correct.", response.getBody());
    }

    @Test
    void testGetAllPaymentsByRentalID() {
        PaymentDTO paymentDTO = new PaymentDTO();
        paymentDTO.setRentalID(1L);
        paymentDTO.setAmount(1000);
        paymentDTO.setDate(new Date());

        when(paymentService.getAllPaymentsByRentalID(1L)).thenReturn(Arrays.asList(paymentDTO));

        ResponseEntity<?> response = paymentController.getAllPaymentsByRentalID(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, ((List<PaymentDTO>) response.getBody()).size());
    }

    @Test
    void testGetAllPaymentsByRentalID_NotFound() {
        when(paymentService.getAllPaymentsByRentalID(1L)).thenThrow(new IllegalArgumentException("No payments found."));

        ResponseEntity<?> response = paymentController.getAllPaymentsByRentalID(1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No payments found for the provided rental ID: 1", response.getBody());
    }

    @Test
    void testGetAllOutstandingPaymentsByRentalID() {
        String jsonResponse = "{\"Outstanding Months\": [1, 2, 3]}";
        when(paymentService.getAllOutstandingPaymentsByRentalID(1L)).thenReturn(jsonResponse);

        ResponseEntity<String> response = paymentController.getAllOutstandingPaymentsByRentalID(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(jsonResponse, response.getBody());
    }

    @Test
    void testGetAllOutstandingPaymentsByRentalID_NoContent() {
        String jsonResponse = "{\"Outstanding Months\": []}";
        when(paymentService.getAllOutstandingPaymentsByRentalID(1L)).thenReturn(jsonResponse);

        ResponseEntity<String> response = paymentController.getAllOutstandingPaymentsByRentalID(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals("No outstanding payments for rental ID: 1", response.getBody());
    }

    @Test
    void testSelectTenant() {
        Map<String, Object> rentalInfo = Map.of("rentalPrice", 1000, "paymentHistory", Arrays.asList(200, 300));
        when(paymentService.selectTenant(1L, 1L)).thenReturn(rentalInfo);

        ResponseEntity<?> response = paymentController.selectTenant(1L, 1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(rentalInfo, response.getBody());
    }

    @Test
    void testSelectTenant_NotFound() {
        when(paymentService.selectTenant(1L, 1L)).thenThrow(new IllegalArgumentException("Listing not found."));

        ResponseEntity<?> response = paymentController.selectTenant(1L, 1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Error: Listing not found.", response.getBody());
    }
}
