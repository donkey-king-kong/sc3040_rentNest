package RentNest.dto;

public class ReviewsDTO{
    private Long reviewID;
    private Long userID;
    private int rating;
    private String title;
    private String text;
    private Long reviewerID;
    private String reviewerName;
    private String reviewerEmail;
    private String reviewerPhotoURL;
    private boolean flagged;

    public Long getReviewID() {
        return reviewID;
    }

    public void setReviewID(Long reviewID) {
        this.reviewID = reviewID;
    }

    public Long getUserID() {
        return userID;
    }

    public void setUserID(Long userID) {
        this.userID = userID;
    }

    public String getReviewerEmail() {
        return reviewerEmail;
    }
    public String getReviewerName() {
        return reviewerName;
    }
    public String getReviewerPhotoURL() {
        return reviewerPhotoURL;
    }
    public void setReviewerEmail(String reviewerEmail) {
        this.reviewerEmail = reviewerEmail;
    }
    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }
    public void setReviewerPhotoURL(String reviewerPhotoURL) {
        this.reviewerPhotoURL = reviewerPhotoURL;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Long getReviewerID() {
        return reviewerID;
    }

    public void setReviewerID(Long reviewerID) {
        this.reviewerID = reviewerID;
    }

    public boolean isFlagged() {
        return flagged;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }

}

