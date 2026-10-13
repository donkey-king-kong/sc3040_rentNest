package RentNest.dto;

import java.util.Date;

public record ChatSummaryDTO(
        Long partnerId,
        String partnerName,
        String partnerPhotoURL,
        Long messageID,
        String message,
        Date date) {
}
