package RentNest.dto;

public class UserDTO {
    private Long userID;
    private String name;
    private String email;
    private String contact;
    private String photoURL;
    private int flagged;

    // Getters
    public Long getUserId() {
        return userID;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getContact() {
        return contact;
    }

    public String getPhotoURL() {
        return photoURL;
    }

    public int getFlagged() {
        return flagged;
    }


    // Setters
    public void setUserId(Long userID) {
        this.userID = userID;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public void setPhotoURL(String photoURL) {
        this.photoURL = photoURL;
    }

    public void setFlagged(int flagged) {
        this.flagged = flagged;
    }
}
