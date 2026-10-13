package RentNest.dto;

public record InboxListingDTO(
        Long listingID, String name, String location, String listingpicture,
        Long ownerId, Long tenantId, String role) {
}
