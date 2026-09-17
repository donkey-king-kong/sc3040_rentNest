package RentNest.dto;

import java.util.Date;

public class ChatHistoryDTO {
    private Long messageID;
    private Long receiverID;
    private Long senderID;
    private Long rentalID;
    private Long requestID;
    private String message;
    private Date date;

    // Getters
    public Long getMessageID() {
        return messageID;
    }

    public Long getReceiverID() {
        return receiverID;
    }

    public Long getSenderID() {
        return senderID;
    }

    public Long getRentalID() {
        return rentalID;
    }

    public Long getRequestID() {
        return requestID;
    }

    public String getMessage() {
        return message;
    }

    public Date getDate() {
        return date;
    }

    // Setters
    public void setMessageID(Long messageID) {
        this.messageID = messageID;
    }

    public void setReceiver(Long receiverID) {
        this.receiverID = receiverID;
    }

    public void setSender(Long senderID) {
        this.senderID = senderID;
    }

    public void setRental(Long rentalID) {
        this.rentalID = rentalID;
    }

    public void setRequest(Long request) {
        this.requestID = request;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setDate(Date date) {
        this.date = date;
    }
}
