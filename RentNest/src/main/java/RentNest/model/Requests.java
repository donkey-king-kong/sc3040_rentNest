package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "request")
public class Requests {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rentalid", referencedColumnName = "rentalid")
    private Rentals rentals;

    private String status;
    private long refundAmount;

    // Getters
    public Long getRequestID() {
        return requestID;
    }

    @JsonIgnore
    public Rentals getRentals() {
        return rentals;
    }

    @JsonProperty("rentalId")
    public Long getRentalId() {
        return rentals != null ? rentals.getRentalID() : null;
    }

    @JsonProperty("listingName")
    public String getListingName() {
        return rentals != null && rentals.getListings() != null ? 
            rentals.getListings().getName() : null;
    }

    @JsonProperty("tenantUserId")
    public Long getTenantUserId() {
        return rentals != null ? rentals.getTenantUserID() : null;
    }

    @JsonProperty("rentalPrice")
    public Long getRentalPrice() {
        return rentals != null ? rentals.getRentalPrice() : null;
    }

    public String getStatus() {
        return status;
    }

    public long getRefundAmount() {
        return refundAmount;
    }

    // Setters
    public void setRequestID(Long requestID) {
        this.requestID = requestID;
    }

    public void setRentals(Rentals rentals) {
        this.rentals = rentals;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setRefundAmount(long refundAmount) {
        this.refundAmount = refundAmount;
    }
}
