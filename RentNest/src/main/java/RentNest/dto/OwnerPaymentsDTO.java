package RentNest.dto;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;

public record OwnerPaymentsDTO(
        Long rentalID, Long rentalPrice, List<Row> payments,
        List<LocalDate> outstandingMonths, long totalOutstandingAmount) {
    public record Row(Long paymentID, long amount, Date date) {}
}
