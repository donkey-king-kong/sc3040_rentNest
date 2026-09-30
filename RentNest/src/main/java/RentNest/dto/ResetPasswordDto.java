package RentNest.dto;

public class ResetPasswordDto {

    private String email;
    private String newPassword;

    public String getEmail() {
        return email;
    }

    public ResetPasswordDto setEmail(String email) {
        this.email = email;
        return this;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public ResetPasswordDto setNewPassword(String newPassword) {
        this.newPassword = newPassword;
        return this;
    }
}
