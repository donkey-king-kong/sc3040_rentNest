package RentNest.dto;

public class AiChatQuestionResponseDTO {
    private boolean allowed;
    private String category;
    private String answer;
    private boolean placeholder;

    public AiChatQuestionResponseDTO() {
    }

    public AiChatQuestionResponseDTO(boolean allowed, String category, String answer, boolean placeholder) {
        this.allowed = allowed;
        this.category = category;
        this.answer = answer;
        this.placeholder = placeholder;
    }

    public boolean isAllowed() {
        return allowed;
    }

    public String getCategory() {
        return category;
    }

    public String getAnswer() {
        return answer;
    }

    public boolean isPlaceholder() {
        return placeholder;
    }

    public void setAllowed(boolean allowed) {
        this.allowed = allowed;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public void setPlaceholder(boolean placeholder) {
        this.placeholder = placeholder;
    }
}
