package RentNest.repository;

import RentNest.model.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
    // Get chat history from rentalID
    List<ChatHistory> findByRental_RentalID(Long rentalID);

    // Get chat history by user ID (user can be either sender or receiver)
    List<ChatHistory> findBySender_UserIDOrReceiver_UserID(Long userID1, Long userID2);

    // Query to get distinct chat partner IDs for a specific user ID
    @Query("SELECT DISTINCT CASE WHEN ch.sender.userID = :userID THEN ch.receiver.userID ELSE ch.sender.userID END " +
            "FROM ChatHistory ch " +
            "WHERE ch.sender.userID = :userID OR ch.receiver.userID = :userID")
    List<Long> findDistinctChatPartnerIDsByUserID(Long userID);

    // Get chat history between two users sorted by date
    @Query("SELECT ch FROM ChatHistory ch WHERE " +
            "(ch.sender.userID = :userA AND ch.receiver.userID = :userB) OR " +
            "(ch.sender.userID = :userB AND ch.receiver.userID = :userA) " +
            "ORDER BY ch.date ASC")
    List<ChatHistory> findConversationBetweenUsers(Long userA, Long userB);
}

