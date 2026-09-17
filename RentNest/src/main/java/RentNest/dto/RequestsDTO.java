package RentNest.dto;

public class RequestsDTO {
    private Long requestID;
    private Long rentalID;
    private String status;
    private long refundAmount;

    // Getters
    public Long getRequestID() {
        return requestID;
    }

    public Long getRentalID() {
        return rentalID;
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

    public void setRentalsID(Long rentalID) {
        this.rentalID = rentalID;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setRefundAmount(long refundAmount) {
        this.refundAmount = refundAmount;
    }


}
