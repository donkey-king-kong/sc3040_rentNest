package RentNest.dto;

import java.util.Date;

public record ChatMessageDTO(
        Long messageID,
        Long receiverId,
        String receiverName,
        String receiverPhotoURL,
        Long senderId,
        String senderName,
        String senderPhotoURL,
        Long rentalId,
        Long requestId,
        Long listingId,
        String listingNameSnapshot,
        String listingAddressSnapshot,
        String message,
        Date date) {
}
