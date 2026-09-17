package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.util.Date;

@Entity
@Table(name = "rentals")
public class Rentals {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rentalID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listingid", referencedColumnName = "listingid")
    private Listings listings;

    private Long tenantUserID;
    private Long rentalPrice;
    private Long depositPrice;
    private Date rentalDate;
    private Date leaseExpiry;
    private String paymentHistory;
    private String status;

    // Lifecycle timestamps, set by the server only; never accepted from requests
    @Column(name = "created_at", updatable = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Date createdAt;

    @Column(name = "accepted_at")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Date acceptedAt;

    @Column(name = "terminated_at")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Date terminatedAt;

    @PrePersist
    void recordCreation() {
        if (createdAt == null) {
            createdAt = new Date();
        }
    }

    // Getters
    public Long getRentalID() {
        return rentalID;
    }

    @JsonIgnore
    public Listings getListings() {
        return listings;
    }

    // Listing attributes

    @JsonProperty("listingId")
    public Long getListingId() {
        return listings != null ? listings.getListingID() : null;
    }

    @JsonProperty("listingName")
    public String getListingName() {
        return listings != null ? listings.getName() : null;
    }

    @JsonProperty("listingLocation")
    public String getListingLocation() {
        return listings != null ? listings.getLocation() : null;
    }

    @JsonProperty("listingType")
    public String getListingType() {
        return listings != null ? listings.getType() : null;
    }

    @JsonProperty("listingSize")
    public Integer getListingSize() {
        return listings != null ? listings.getSize() : null;
    }

    @JsonProperty("listingBeds")
    public Integer getListingBeds() {
        return listings != null ? listings.getBeds() : null;
    }

    @JsonProperty("listingBathroom")
    public Integer getListingBathroom() {
        return listings != null ? listings.getBathroom() : null;
    }

    @JsonProperty("ownerUserId")
    public Long getOwnerUserId() {
        return listings != null ? listings.getOwner().getUserID() : null;
    }

    @JsonProperty("ownerName")
    public String getOwnerName() {
        return listings != null && listings.getOwner() != null ? 
            listings.getOwner().getUsername() : null;
    }

    public Long getTenantUserID() {
        return tenantUserID;
    }

    public Long getRentalPrice() {
        return rentalPrice;
    }

    public Long getDepositPrice() {
        return depositPrice;
    }

    public Date getRentalDate() {
        return rentalDate;
    }

    public Date getLeaseExpiry() {
        return leaseExpiry;
    }

    public String getPaymentHistory() {
        return paymentHistory;
    }

    public String getStatus() {
        return status;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getAcceptedAt() {
        return acceptedAt;
    }

    public Date getTerminatedAt() {
        return terminatedAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setAcceptedAt(Date acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public void setTerminatedAt(Date terminatedAt) {
        this.terminatedAt = terminatedAt;
    }

    // Setters
    public void setRentalID(Long rentalID) {
        this.rentalID = rentalID;
    }

    public void setListings(Listings listings) {
        this.listings = listings;
    }

    public void setTenantUserID(Long tenantUserID) {
        this.tenantUserID = tenantUserID;
    }

    public void setRentalPrice(Long rentalPrice) {
        this.rentalPrice = rentalPrice;
    }

    public void setDepositPrice(Long depositPrice) {
        this.depositPrice = depositPrice;
    }

    public void setRentalDate(Date rentalDate) {
        this.rentalDate = rentalDate;
    }

    public void setLeaseExpiry(Date leaseExpiry) {
        this.leaseExpiry = leaseExpiry;
    }

    public void setPaymentHistory(String paymentHistory) {
        this.paymentHistory = paymentHistory;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
