package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.util.Date;

@Entity
@Table(name = "chathistory")
public class ChatHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiverid", referencedColumnName = "userid")
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "senderid", referencedColumnName = "userid")
    private User sender;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rentalid", referencedColumnName = "rentalid")
    private Rentals rental;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requestid", referencedColumnName = "requestid")
    private Requests request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listingid")
    private Listings listing;

    @Column(name = "listing_name_snapshot", columnDefinition = "TEXT")
    private String listingNameSnapshot;

    @Column(name = "listing_address_snapshot", columnDefinition = "TEXT")
    private String listingAddressSnapshot;

    @JsonIgnore
    public Listings getListing() { return listing; }
    public Long getListingId() { return listing == null ? null : listing.getListingID(); }
    public String getListingNameSnapshot() { return listingNameSnapshot; }
    public String getListingAddressSnapshot() { return listingAddressSnapshot; }
    public void setListing(Listings listing) { this.listing = listing; }
    public void setListingNameSnapshot(String value) { this.listingNameSnapshot = value; }
    public void setListingAddressSnapshot(String value) { this.listingAddressSnapshot = value; }

    private String message;
    private Date date;

    // Getters
    public Long getMessageID() {
        return messageID;
    }

    @JsonIgnore
    public User getReceiver() {
        return receiver;
    }

    @JsonProperty("receiverId")
    public Long getReceiverId() {
        return receiver != null ? receiver.getUserID() : null;
    }

    @JsonProperty("receiverName")
    public String getReceiverName() {
        return receiver != null ? receiver.getName() : null;
    }

    @JsonProperty("receiverPhotoURL")
    public String getReceiverPhotoURL() {
        return receiver != null ? receiver.getPhotoURL() : null;
    }

    @JsonIgnore
    public User getSender() {
        return sender;
    }

    @JsonProperty("senderId")
    public Long getSenderId() {
        return sender != null ? sender.getUserID() : null;
    }

    @JsonProperty("senderName")
    public String getSenderName() {
        return sender != null ? sender.getName() : null;
    }

    @JsonProperty("senderPhotoURL")
    public String getSenderPhotoURL() {
        return sender != null ? sender.getPhotoURL() : null;
    }

    @JsonIgnore
    public Rentals getRental() {
        return rental;
    }

    @JsonProperty("rentalId")
    public Long getRentalId() {
        return rental != null ? rental.getRentalID() : null;
    }

    @JsonIgnore
    public Requests getRequest() {
        return request;
    }

    @JsonProperty("requestId")
    public Long getRequestId() {
        return request != null ? request.getRequestID() : null;
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

    public void setReceiver(User receiver) {
        this.receiver = receiver;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public void setRental(Rentals rental) {
        this.rental = rental;
    }

    public void setRequest(Requests request) {
        this.request = request;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setDate(Date date) {
        this.date = date;
    }
}
