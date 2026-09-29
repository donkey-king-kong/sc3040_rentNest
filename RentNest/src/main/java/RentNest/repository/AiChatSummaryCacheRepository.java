package RentNest.repository;

import RentNest.model.AiChatSummaryCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiChatSummaryCacheRepository extends JpaRepository<AiChatSummaryCache, Long> {
    Optional<AiChatSummaryCache> findByUserAIdAndUserBId(Long userAId, Long userBId);
}
