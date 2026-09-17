package RentNest.dto;

import java.util.Date;

public class RentalsDTO {
    private Long rentalID;
    private Long listingID;
    private Long tenantUserID;
    private Long rentalPrice;
    private Long depositPrice;
    private Date rentalDate;
    private Date leaseExpiry;
    private String paymentHistory;
    private String status;

    // Getters
    public Long getRentalID() {
        return rentalID;
    }

    public Long getListingID() {
        return listingID;
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

    // Setters
    public void setRentalID(Long rentalID) {
        this.rentalID = rentalID;
    }

    public void setListingsID(Long listingID) {
        this.listingID = listingID;
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
