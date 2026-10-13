package RentNest.service;

import RentNest.dto.OwnerPaymentsDTO;
import RentNest.dto.OwnerRentalInfoDTO;
import RentNest.dto.OwnerTenantSummaryDTO;
import RentNest.repository.ListingsRepository;
import RentNest.repository.PaymentRepository;
import RentNest.repository.RentalsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
@Transactional(readOnly = true)
public class RentalDetailService {
    private static final Logger log = LoggerFactory.getLogger(RentalDetailService.class);
    private final ListingsRepository listings;
    private final RentalsRepository rentals;
    private final PaymentRepository payments;

    public RentalDetailService(ListingsRepository listings, RentalsRepository rentals, PaymentRepository payments) {
        this.listings = listings;
        this.rentals = rentals;
        this.payments = payments;
    }

    public OwnerRentalInfoDTO rentalInfo(Long ownerId, Long listingId) {
        return timed("property", () -> listings.findOwnerRentalInfo(listingId, ownerId)
                .orElseThrow(RentalDetailService::unavailable));
    }

    public OwnerTenantSummaryDTO tenantSummary(Long ownerId, Long listingId, Long tenantId) {
        return timed("summary", () -> rentals.findOwnerTenantSummary(ownerId, listingId, tenantId)
                .orElseThrow(RentalDetailService::unavailable));
    }

    public OwnerPaymentsDTO paymentSummary(Long ownerId, Long rentalId) {
        return timed("payments", () -> {
            OwnerTenantSummaryDTO rental = rentals.findOwnerPaymentContext(ownerId, rentalId)
                    .orElseThrow(RentalDetailService::unavailable);
            var rows = payments.findAllByRentalID(rentalId).stream()
                    .map(p -> new OwnerPaymentsDTO.Row(p.getPaymentId(), p.getAmount(), p.getDate()))
                    .toList();
            return calculatePayments(rental, rows, LocalDate.now(), ZoneId.systemDefault());
        });
    }

    // Preserve the existing calendar-month rule: any payment in a month marks that month paid.
    // Empty history is valid; it must not short-circuit the outstanding-month calculation.
    public static OwnerPaymentsDTO calculatePayments(OwnerTenantSummaryDTO rental,
            List<OwnerPaymentsDTO.Row> rows, LocalDate today, ZoneId zone) {
        if (rental.rentalDate() == null || rental.leaseExpiry() == null
                || rental.rentalPrice() == null || rental.rentalPrice() <= 0
                || rental.leaseExpiry().before(rental.rentalDate())
                || rows.stream().anyMatch(row -> row.date() == null)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Incomplete rental payment data");
        }
        var paidMonths = new HashSet<LocalDate>();
        for (var row : rows) paidMonths.add(month(row.date(), zone));
        var outstanding = new ArrayList<LocalDate>();
        LocalDate last = today.withDayOfMonth(1);
        LocalDate expiry = month(rental.leaseExpiry(), zone);
        if (expiry.isBefore(last)) last = expiry;
        for (LocalDate cursor = month(rental.rentalDate(), zone); !cursor.isAfter(last); cursor = cursor.plusMonths(1)) {
            if (!paidMonths.contains(cursor)) outstanding.add(cursor);
        }
        outstanding.sort(Comparator.reverseOrder());
        var sorted = rows.stream().sorted(Comparator.comparing(OwnerPaymentsDTO.Row::date).reversed()
                .thenComparing(OwnerPaymentsDTO.Row::paymentID, Comparator.reverseOrder())).toList();
        return new OwnerPaymentsDTO(rental.rentalID(), rental.rentalPrice(), sorted, outstanding,
                Math.multiplyExact((long) outstanding.size(), rental.rentalPrice()));
    }

    private static LocalDate month(Date date, ZoneId zone) {
        return java.time.Instant.ofEpochMilli(date.getTime()).atZone(zone).toLocalDate().withDayOfMonth(1);
    }

    private static ResponseStatusException unavailable() {
        // Do not reveal whether another owner's property or tenancy exists.
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Property or active tenancy unavailable");
    }

    private <T> T timed(String operation, Supplier<T> work) {
        long start = System.nanoTime();
        try {
            T result = work.get();
            log.info("[RentalDetail] event=data_completed requestId={} operation={} durationMs={}",
                    MDC.get("rentalRequestId"), operation, elapsed(start));
            return result;
        } catch (RuntimeException error) {
            log.warn("[RentalDetail] event=data_failed requestId={} operation={} errorType={} durationMs={}",
                    MDC.get("rentalRequestId"), operation, error.getClass().getSimpleName(), elapsed(start));
            throw error;
        }
    }

    private static long elapsed(long start) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
    }
}
