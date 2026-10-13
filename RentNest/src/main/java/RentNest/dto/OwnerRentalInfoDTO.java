package RentNest.dto;

public record OwnerRentalInfoDTO(
        Long listingID, String name, String location, String listingpicture, Integer price,
        Long ownerId, String ownerName, String ownerPhotoURL,
        Long tenantId, String tenantName, String tenantPhotoURL) {
}
