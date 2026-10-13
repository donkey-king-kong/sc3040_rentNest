package RentNest.service;

import RentNest.dto.InboxListingDTO;
import RentNest.repository.ListingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class InboxService {
    private static final Logger log = LoggerFactory.getLogger(InboxService.class);
    private final ListingsRepository listings;

    public InboxService(ListingsRepository listings) {
        this.listings = listings;
    }

    @Transactional(readOnly = true)
    public List<InboxListingDTO> getListings(Long userId) {
        long start = System.nanoTime();
        try {
            List<InboxListingDTO> result = listings.findInboxListings(userId);
            log.info("[Inbox] event=query_completed requestId={} rows={} durationMs={}",
                    MDC.get("inboxRequestId"), result.size(), elapsed(start));
            return result;
        } catch (RuntimeException failure) {
            // Exception messages can contain SQL values or connection details.
            log.error("[Inbox] event=query_failed requestId={} errorType={} durationMs={}",
                    MDC.get("inboxRequestId"), failure.getClass().getSimpleName(), elapsed(start));
            throw failure;
        }
    }

    private static long elapsed(long start) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
    }
}
