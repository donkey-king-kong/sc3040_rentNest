package RentNest.model;

import jakarta.persistence.*;

import java.util.Date;

@Entity
@Table(
        name = "ai_chat_summary_cache",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_a_id", "user_b_id"})
)
public class AiChatSummaryCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_a_id", nullable = false)
    private Long userAId;

    @Column(name = "user_b_id", nullable = false)
    private Long userBId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "last_message_id", nullable = false)
    private Long lastMessageId;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "updated_at", nullable = false)
    private Date updatedAt;

    // Getters
    public Long getId() {
        return id;
    }

    public Long getUserAId() {
        return userAId;
    }

    public Long getUserBId() {
        return userBId;
    }

    public String getSummary() {
        return summary;
    }

    public Long getLastMessageId() {
        return lastMessageId;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    // Setters
    public void setId(Long id) {
        this.id = id;
    }

    public void setUserAId(Long userAId) {
        this.userAId = userAId;
    }

    public void setUserBId(Long userBId) {
        this.userBId = userBId;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public void setLastMessageId(Long lastMessageId) {
        this.lastMessageId = lastMessageId;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
