package RentNest.dto;

import java.util.List;

public record ChatSummariesDTO(Long currentUserId, List<ChatSummaryDTO> chats) {
}
