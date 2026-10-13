package RentNest.RentNest;

import RentNest.dto.OwnerPaymentsDTO;
import RentNest.dto.OwnerTenantSummaryDTO;
import RentNest.service.RentalDetailService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RentalDetailPaymentTest {
    private final ZoneId zone = ZoneId.of("Asia/Singapore");
    private Date date(String value) { return Date.from(LocalDate.parse(value).atStartOfDay(zone).toInstant()); }
    private OwnerTenantSummaryDTO rental(String start, String end) {
        return new OwnerTenantSummaryDTO(1L, 2L, 3L, 4L, "Tenant", null, "active", 3000L, date(start), date(end));
    }
    @Test void capsAtExpiryAndIncludesPartialFirstAndLastMonths() {
        var result = RentalDetailService.calculatePayments(rental("2026-01-20", "2026-03-02"),
                List.of(), LocalDate.parse("2026-10-13"), zone);
        assertEquals(List.of(LocalDate.parse("2026-03-01"), LocalDate.parse("2026-02-01"),
                LocalDate.parse("2026-01-01")), result.outstandingMonths());
        assertEquals(9000, result.totalOutstandingAmount());
    }
    @Test void futureRentalHasNoDueMonths() {
        var result = RentalDetailService.calculatePayments(rental("2026-11-01", "2027-11-01"),
                List.of(), LocalDate.parse("2026-10-13"), zone);
        assertTrue(result.outstandingMonths().isEmpty());
    }
    @Test void duplicateMonthAndOutOfRangePaymentsDoNotPayOtherMonths() {
        var rows = List.of(new OwnerPaymentsDTO.Row(1L, 3000, date("2026-01-02")),
                new OwnerPaymentsDTO.Row(2L, 3000, date("2026-01-15")),
                new OwnerPaymentsDTO.Row(3L, 3000, date("2025-12-15")));
        var result = RentalDetailService.calculatePayments(rental("2026-01-01", "2026-12-31"),
                rows, LocalDate.parse("2026-02-10"), zone);
        assertEquals(List.of(LocalDate.parse("2026-02-01")), result.outstandingMonths());
        assertEquals(2L, result.payments().getFirst().paymentID());
    }
    @Test void malformedDatesAreNotSilentlyTreatedAsPaid() {
        assertThrows(ResponseStatusException.class, () -> RentalDetailService.calculatePayments(
                rental("2026-03-01", "2026-01-01"), List.of(), LocalDate.now(), zone));
        assertThrows(ResponseStatusException.class, () -> RentalDetailService.calculatePayments(
                rental("2026-01-01", "2026-12-31"),
                List.of(new OwnerPaymentsDTO.Row(1L, 3000, null)), LocalDate.now(), zone));
    }
}
