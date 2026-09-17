package RentNest.service;

import RentNest.dto.PaymentDTO;
import RentNest.model.Payment;
import RentNest.repository.PaymentRepository;
import RentNest.model.Rentals;
import RentNest.dto.RentalsDTO;
import RentNest.repository.RentalsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final RentalsRepository rentalsRepository;
    private final ListingsService listingsService;
    private final RentalsService rentalsService;

    public PaymentDTO toPaymentDTO(Payment payment) {
        PaymentDTO paymentDTO = new PaymentDTO();

        paymentDTO.setPaymentID(payment.getPaymentId());
        paymentDTO.setAmount(payment.getAmount());
        paymentDTO.setDate(payment.getDate());

        RentalsDTO rentalsDTO = new RentalsDTO();
        rentalsDTO.setRentalID(payment.getRentals().getRentalID());

        paymentDTO.setRentalID(rentalsDTO.getRentalID());

        return paymentDTO;
    }

    @Autowired
    public PaymentService(RentalsRepository rentalsRepository, PaymentRepository paymentRepository,
                          ListingsService listingsService, RentalsService rentalsService) {
        this.rentalsRepository = rentalsRepository;
        this.paymentRepository = paymentRepository;
        this.listingsService = listingsService;
        this.rentalsService = rentalsService;
    }

    //CRUD
    //Create
    public Payment createPayment(PaymentDTO paymentDTO) {
        Rentals rentals = rentalsRepository.findById(paymentDTO.getRentalID())
                .orElseThrow(() -> new IllegalArgumentException("Rentals not found"));

        // Validate the payment amount
        // If amount less than or equal to 0 throw error
        if (paymentDTO.getAmount() <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero.");
        }

        Payment payment = new Payment();
        payment.setAmount(paymentDTO.getAmount());
        payment.setDate(paymentDTO.getDate());
        payment.setRentals(rentals);

        return paymentRepository.save(payment);
    }

//    Example:
//    {
//        "rentalID":3, // Make sure it exists
//        "amount":500,
//        "date":"2024-10-09"
//    }

    //read all payments
    public List<Payment> getAllPayment() {
        return paymentRepository.findAll();
    }

    //read specific payments
    public Optional<Payment> getPaymentID(Long id) {
        return paymentRepository.findById(id);
    }

    //update payment
    public Payment updatePayment(Long id, PaymentDTO paymentDTO) {
        Payment existingPayment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        Rentals rentals = rentalsRepository.findById(paymentDTO.getRentalID())
                .orElseThrow(() -> new IllegalArgumentException("Rentals not found"));

        existingPayment.setAmount(paymentDTO.getAmount());
        existingPayment.setDate(paymentDTO.getDate());
        existingPayment.setRentals(rentals);

        return paymentRepository.save(existingPayment);
    }

    public void deletePayment(Long id) {
        paymentRepository.deleteById(id);
    }

    /*
        Add one more row in payment table
        Make monthly payment
    */
    public boolean makeMonthlyPayment(PaymentDTO paymentDTO) {
        try {
            // Fetch the rental by rental ID from RentalsRepository
            Rentals rentals = rentalsRepository.findById(paymentDTO.getRentalID())
                    .orElseThrow(() -> new IllegalArgumentException("Rental not found for Rental ID: " + paymentDTO.getRentalID()));

            // Retrieve the rental price from the Rentals entity using the getRentalPrice() method from RentalDTO
            double rentalPrice = rentals.getRentalPrice();

            // Compare the user's payment amount with the rental price
            if (paymentDTO.getAmount() != rentalPrice) {
                throw new IllegalArgumentException("Incorrect payment amount. Expected: " + rentalPrice);
            }

            // If the amount matches, create the payment
            createPayment(paymentDTO);
            return true;  // Return true if payment creation is successful
        } catch (Exception e) {
            // Return false if any error occurs
            return false;
        }
    }

    // Get all payments by rental ID
    public List<PaymentDTO> getAllPaymentsByRentalID(Long rentalID) {
        List<Payment> payments = paymentRepository.findAllByRentalID(rentalID);
        if (payments.isEmpty()) {
            throw new IllegalArgumentException("No payments found for rental ID: " + rentalID);
        }
        return payments.stream()
                .map(this::toPaymentDTO)
                .collect(Collectors.toList());
    }

    public String getAllOutstandingPaymentsByRentalID(Long rentalID) {
        // Get rental by rental ID (same logic as before)
        Rentals rental = rentalsRepository.findById(rentalID)
                .orElseThrow(() -> new IllegalArgumentException("Rental not found for ID: " + rentalID));

        double rentalPrice = rental.getRentalPrice();
        Date rentalStartDate = rental.getRentalDate();
        LocalDate rentalStartLocalDate = rentalStartDate.toInstant()
                .atZone(ZoneId.systemDefault()).toLocalDate();

        // Fetch lease expiry date and convert it to LocalDate
        Date leaseExpiryDate = rental.getLeaseExpiry();
        LocalDate leaseExpiryLocalDate = leaseExpiryDate.toInstant()
                .atZone(ZoneId.systemDefault()).toLocalDate();

        List<PaymentDTO> allPayments = getAllPaymentsByRentalID(rentalID);

        List<LocalDate> outstandingMonths = new ArrayList<>();
        LocalDate monthPointer = rentalStartLocalDate.withDayOfMonth(1);
        LocalDate currentDate = LocalDate.now().withDayOfMonth(1);

        // Modify loop to stop at either the current date or lease expiry date, whichever comes first
        while (!monthPointer.isAfter(currentDate) && !monthPointer.isAfter(leaseExpiryLocalDate)) {
            LocalDate currentMonthPointer = monthPointer;
            boolean monthPaid = allPayments.stream()
                    .anyMatch(payment -> {
                        LocalDate paymentDate = payment.getDate().toInstant()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate();
                        return paymentDate.withDayOfMonth(1).equals(currentMonthPointer);
                    });

            if (!monthPaid) {
                outstandingMonths.add(currentMonthPointer);
            }

            monthPointer = monthPointer.plusMonths(1);
        }

        double totalOutstandingAmount = outstandingMonths.size() * rentalPrice;

        // Manually construct the JSON string
        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("{\n");
        jsonBuilder.append("  \"Outstanding Months\": [");

        // Add the months to the JSON array
        for (int i = 0; i < outstandingMonths.size(); i++) {
            jsonBuilder.append("\"").append(outstandingMonths.get(i)).append("\"");
            if (i < outstandingMonths.size() - 1) {
                jsonBuilder.append(", ");
            }
        }
        jsonBuilder.append("],\n");

        // Add the total outstanding amount
        jsonBuilder.append("  \"Total Outstanding Amount\": ")
                .append(String.format("%.2f", totalOutstandingAmount))
                .append("\n");
        jsonBuilder.append("}");

        // Return the JSON string
        return jsonBuilder.toString();
    }


    public Map<String, Object> selectTenant(Long listingId, Long tenantId) {
        // Fetch the rental information using the listing ID and Tenant ID
        RentalsDTO rental = rentalsService.getRentalByListingIdAndTenantId(listingId,tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Rental not found for listing ID and tenantID: " + listingId + " & " + tenantId));

        // Fetch the rental price and lease expiry
        Long rentalPrice = rental.getRentalPrice();
        Date leaseExpiry = rental.getLeaseExpiry();  // Retrieve the lease expiry date

        // Fetch the payments associated with this rental
        List<PaymentDTO> payments = getAllPaymentsByRentalID(rental.getRentalID());

        // Using a map to store the rental price, lease expiry, and the payments
        Map<String, Object> response = new HashMap<>();
        response.put("rentalPrice", rentalPrice);  // Add the rental price
        response.put("leaseExpiry", leaseExpiry);  // Add the lease expiry date
        response.put("payments", payments);        // Add the list of payments

        return response;
    }



}


