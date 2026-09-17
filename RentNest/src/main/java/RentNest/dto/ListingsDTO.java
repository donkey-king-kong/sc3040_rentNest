package RentNest.dto;

public class ListingsDTO {
    private Long listingID;
    private Long ownerUserID;
    private String ownerName;
    private String ownerPhotoURL;
    private Long tenantUserID;
    private String name;
    private String type;
    private Integer floor;
    private String unitNumber;
    private String location;
    private Integer postal;
    private Integer price;
    private Integer size;
    private Integer beds;
    private Integer bathroom;
    private String description;
    private boolean flagged;
    private String listingpicture;
    

    // Getters
    public Long getListingID() {
        return listingID;
    }

    public Long getOwnerUserID() {
        return ownerUserID;
    }
    public String getOwnerName() {
        return ownerName;
    }
    public String getOwnerPhotoURL() {
        return ownerPhotoURL;
    }

    public Long getTenantUserID() {
        return tenantUserID;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Integer getFloor() {
        return floor;
    }

    public String getUnitNumber() {
        return unitNumber;
    }

    public String getLocation() {
        return location;
    }

    public Integer getPostal() {
        return postal;
    }

    public Integer getPrice() {
        return price;
    }

    public Integer getSize() {
        return size;
    }

    public Integer getBeds() {
        return beds;
    }

    public Integer getBathroom() {
        return bathroom;
    }

    public String getDescription() {
        return description;
    }

    public boolean isFlagged() {
        return flagged;
    }

    public String getListingpicture() {
        return listingpicture;
    }

    // Setters
    public void setListingID(Long listingID) {
        this.listingID = listingID;
    }

    public void setOwnerUserID(Long ownerUserID) {
        this.ownerUserID = ownerUserID;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }
    
    public void setOwnerPhotoURL(String ownerPhotoURL) {
        this.ownerPhotoURL = ownerPhotoURL;
    }

    public void setTenantUserID(Long tenantUserID) {
        this.tenantUserID = tenantUserID;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setFloor(Integer floor) {
        this.floor = floor;
    }

    public void setUnitNumber(String unitNumber) {
        this.unitNumber = unitNumber;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setPostal(Integer postal) {
        this.postal = postal;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public void setSize(Integer size) {
        this.size = size;
    }

    public void setBeds(Integer beds) {
        this.beds = beds;
    }

    public void setBathroom(Integer bathroom) {
        this.bathroom = bathroom;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }

    public void setListingpicture(String listingpictire) {
        this.listingpicture = listingpictire;
    }

}
