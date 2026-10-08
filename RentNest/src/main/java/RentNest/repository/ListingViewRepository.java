package RentNest.repository;

import RentNest.model.ListingView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Write path for recorded views. Analytics reads them through AnalyticsQueryRepository.
 */
@Repository
public interface ListingViewRepository extends JpaRepository<ListingView, Long> {
}
