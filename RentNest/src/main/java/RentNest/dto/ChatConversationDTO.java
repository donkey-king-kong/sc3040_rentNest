package RentNest.dto;

import java.util.List;

public record ChatConversationDTO(
        Partner partner,
        List<ChatMessageDTO> messages,
        boolean hasMore) {

    public record Partner(Long userID, String name, String photoURL, int flagged) {
    }
}
