package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "reviews")
public class Reviews {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid", referencedColumnName = "userid", nullable = false) // User being reviewed
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewerid", referencedColumnName = "userid", nullable = false) // Reviewer (tenant)
    private User reviewer;

    private int rating;
    private String title;
    private String text;
    private boolean flagged;

    // Getters
    public Long getReviewid() {
        return reviewid;
    }

    @JsonIgnore
    public User getUser() {
        return user;
    }

    @JsonProperty("userId")
    public Long getUserId() {
        return user != null ? user.getUserID() : null;
    }

    @JsonProperty("userName")
    public String getUsername() {
        return user != null ? user.getName() : null;
    }

    @JsonProperty("userEmail")
    public String getUserEmail() {
        return user != null ? user.getEmail() : null;
    }

    @JsonIgnore
    public User getReviewer() {
        return reviewer;
    }

    @JsonProperty("reviewerId")
    public Long getReviewerId() {
        return reviewer != null ? reviewer.getUserID() : null;
    }

    @JsonProperty("reviewerName")
    public String getReviewerName() {
        return reviewer != null ? reviewer.getName() : null;
    }

    @JsonProperty("reviewerEmail")
    public String getReviewerEmail() {
        return reviewer != null ? reviewer.getEmail() : null;
    }

    @JsonProperty("reviewerPhotoURL")
    public String getReviewerPhotoURL() {
        return reviewer != null ? reviewer.getPhotoURL() : null;
    }

    public int getRating() {
        return rating;
    }

    public String getTitle() {
        return title;
    }

    public String getText() {
        return text;
    }

    public boolean isFlagged() {
        return flagged;
    }

    // Setters
    public void setReviewid(Long reviewid) {
        this.reviewid = reviewid;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setReviewer(User reviewer) {
        this.reviewer = reviewer;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }
}