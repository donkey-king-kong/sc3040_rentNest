package RentNest.dto;

public class AiChatSummaryResponseDTO {
    private String summary;
    private boolean placeholder;

    public AiChatSummaryResponseDTO() {
    }

    public AiChatSummaryResponseDTO(String summary, boolean placeholder) {
        this.summary = summary;
        this.placeholder = placeholder;
    }

    public String getSummary() {
        return summary;
    }

    public boolean isPlaceholder() {
        return placeholder;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public void setPlaceholder(boolean placeholder) {
        this.placeholder = placeholder;
    }
}
