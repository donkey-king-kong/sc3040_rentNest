package RentNest.dto;

public class RegisterUserDto {
    private String email;
    private String password;
    private String fullName;
    private String contact;

    public String getEmail() {
        return email;
    }

    

    public String getPassword() {
        return password;
    }

    public String getFullName() {
        return fullName;
    }

    public String getContact() {
        return contact;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }
    

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }
}
