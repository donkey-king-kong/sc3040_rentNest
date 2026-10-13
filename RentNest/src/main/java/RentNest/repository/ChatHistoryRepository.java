package RentNest.repository;

import RentNest.dto.ChatMessageDTO;
import RentNest.dto.ChatSummaryDTO;
import RentNest.model.ChatHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
    @Query("SELECT new RentNest.dto.ChatSummaryDTO(" +
            "CASE WHEN ch.sender.userID = :userId THEN ch.receiver.userID ELSE ch.sender.userID END, " +
            "CASE WHEN ch.sender.userID = :userId THEN ch.receiver.name ELSE ch.sender.name END, " +
            "CASE WHEN ch.sender.userID = :userId THEN ch.receiver.photoURL ELSE ch.sender.photoURL END, " +
            "ch.messageID, COALESCE(ch.message, ''), ch.date) " +
            "FROM ChatHistory ch " +
            "WHERE ch.sender.userID = :userId OR ch.receiver.userID = :userId " +
            "ORDER BY ch.date DESC, ch.messageID DESC")
    List<ChatSummaryDTO> findSummaryCandidates(@Param("userId") Long userId);

    @Query("SELECT new RentNest.dto.ChatMessageDTO(" +
            "ch.messageID, ch.receiver.userID, ch.receiver.name, ch.receiver.photoURL, " +
            "ch.sender.userID, ch.sender.name, ch.sender.photoURL, " +
            "rental.rentalID, request.requestID, listing.listingID, " +
            "ch.listingNameSnapshot, ch.listingAddressSnapshot, ch.message, ch.date) " +
            "FROM ChatHistory ch " +
            "LEFT JOIN ch.rental rental LEFT JOIN ch.request request LEFT JOIN ch.listing listing " +
            "WHERE ((ch.sender.userID = :userId AND ch.receiver.userID = :partnerId) " +
            "OR (ch.sender.userID = :partnerId AND ch.receiver.userID = :userId)) " +
            "AND (:beforeMessageId IS NULL OR ch.messageID < :beforeMessageId) " +
            "ORDER BY ch.messageID DESC")
    List<ChatMessageDTO> findConversationPage(
            @Param("userId") Long userId,
            @Param("partnerId") Long partnerId,
            @Param("beforeMessageId") Long beforeMessageId,
            Pageable pageable);

    @Query("SELECT DISTINCT ch.listing.listingID FROM ChatHistory ch " +
            "WHERE ch.sender.userID = :sender AND ch.receiver.userID = :receiver AND ch.listing IS NOT NULL")
    List<Long> findEnquiredListingIds(Long sender, Long receiver);

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
    @Query("SELECT ch FROM ChatHistory ch " +
            "JOIN FETCH ch.sender " +
            "JOIN FETCH ch.receiver " +
            "LEFT JOIN FETCH ch.listing " +
            "LEFT JOIN FETCH ch.rental rental " +
            "LEFT JOIN FETCH rental.listings rentalListing " +
            "LEFT JOIN FETCH rentalListing.owner " +
            "LEFT JOIN FETCH rentalListing.tenant " +
            "LEFT JOIN FETCH ch.request request " +
            "LEFT JOIN FETCH request.rentals requestRental " +
            "LEFT JOIN FETCH requestRental.listings requestListing " +
            "LEFT JOIN FETCH requestListing.owner " +
            "LEFT JOIN FETCH requestListing.tenant " +
            "WHERE " +
            "(ch.sender.userID = :userA AND ch.receiver.userID = :userB) OR " +
            "(ch.sender.userID = :userB AND ch.receiver.userID = :userA) " +
            "ORDER BY ch.date ASC")
    List<ChatHistory> findConversationBetweenUsers(Long userA, Long userB);
}
