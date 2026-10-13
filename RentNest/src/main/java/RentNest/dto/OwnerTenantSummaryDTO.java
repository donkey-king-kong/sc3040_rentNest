package RentNest.dto;

import java.util.Date;

public record OwnerTenantSummaryDTO(
        Long rentalID, Long listingId, Long ownerUserId, Long tenantUserID,
        String tenantName, String tenantPhotoURL, String status,
        Long rentalPrice, Date rentalDate, Date leaseExpiry) {
}
