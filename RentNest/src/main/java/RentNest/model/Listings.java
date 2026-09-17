package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "listings")
public class Listings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long listingID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owneruserid", referencedColumnName = "userid")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenantuserid", referencedColumnName = "userid")
    private User tenant;

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

    @JsonIgnore
    public User getOwner() {
        return owner;
    }

    @JsonProperty("ownerId")
    public Long getOwnerId() {
        return owner != null ? owner.getUserID() : null;
    }

    @JsonProperty("ownerName")
    public String getOwnerName() {
        return owner != null ? owner.getName() : null;
    }

    @JsonProperty("ownerPhotoURL")
    public String getOwnerPhotoURL() {
        return owner != null ? owner.getPhotoURL() : null;
    }

    @JsonIgnore
    public User getTenant() {
        return tenant;
    }

    @JsonProperty("tenantId")
    public Long getTenantId() {
        return tenant != null ? tenant.getUserID() : null;
    }

    @JsonProperty("tenantName")
    public String getTenantName() {
        return tenant != null ? tenant.getName() : null;
    }

    @JsonProperty("tenantPhotoURL")
    public String getTenantPhotoURL() {
        return tenant != null ? tenant.getPhotoURL() : null;
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

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public void setTenant(User tenant) {
        this.tenant = tenant;
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

    public void setListingpicture(String listingpicture) {
        this.listingpicture = listingpicture;
    }
}
