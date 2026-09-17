package RentNest.security;

public class LoginResponse {
    private String token;
    private long expiresIn;
    private Long userId;  // Add this if you need the userId

    // Getters and setters
    public String getToken() {
        return token;
    }

    public LoginResponse setToken(String token) {
        this.token = token;
        return this;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public LoginResponse setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
        return this;
    }

    public Long getUserId() {
        return userId;
    }

    public LoginResponse setUserId(Long userId) {
        this.userId = userId;
        return this;
    }
}