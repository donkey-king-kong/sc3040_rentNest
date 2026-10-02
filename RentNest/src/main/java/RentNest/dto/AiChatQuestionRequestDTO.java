package RentNest.dto;

public class AiChatQuestionRequestDTO {
    private Long userA;
    private Long userB;
    private String question;

    public Long getUserA() {
        return userA;
    }

    public Long getUserB() {
        return userB;
    }

    public String getQuestion() {
        return question;
    }

    public void setUserA(Long userA) {
        this.userA = userA;
    }

    public void setUserB(Long userB) {
        this.userB = userB;
    }

    public void setQuestion(String question) {
        this.question = question;
    }
}
