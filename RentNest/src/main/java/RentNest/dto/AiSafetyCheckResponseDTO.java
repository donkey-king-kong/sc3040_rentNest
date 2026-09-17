package RentNest.dto;

public class AiSafetyCheckResponseDTO {
    private boolean safe;
    private String category;
    private String reason;
    private boolean placeholder;

    public AiSafetyCheckResponseDTO() {
    }

    public AiSafetyCheckResponseDTO(boolean safe, String category, String reason, boolean placeholder) {
        this.safe = safe;
        this.category = category;
        this.reason = reason;
        this.placeholder = placeholder;
    }

    public boolean isSafe() {
        return safe;
    }

    public String getCategory() {
        return category;
    }

    public String getReason() {
        return reason;
    }

    public boolean isPlaceholder() {
        return placeholder;
    }

    public void setSafe(boolean safe) {
        this.safe = safe;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public void setPlaceholder(boolean placeholder) {
        this.placeholder = placeholder;
    }
}
