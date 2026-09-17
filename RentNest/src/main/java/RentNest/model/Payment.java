package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.util.Date;

@Entity
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long PaymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rentalid", referencedColumnName = "rentalid")
    private Rentals rentals;

    private Long amount;
    private Date date;

    public Long getPaymentId() {
        return PaymentId;
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

    public long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public void setPaymentId(Long paymentId) {
        PaymentId = paymentId;
    }
  
    public void setRentals(Rentals rentals) {
        this.rentals = rentals;
    }
}
