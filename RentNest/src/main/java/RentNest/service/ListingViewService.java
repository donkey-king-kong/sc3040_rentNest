package RentNest.service;

import RentNest.model.ListingView;
import RentNest.model.Listings;
import RentNest.model.User;
import RentNest.repository.ListingViewRepository;
import RentNest.repository.ListingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Records views of a listing detail page.
 *
 * The viewer is always the authenticated user; the request cannot name someone else,
 * and it cannot supply the time. An owner opening their own listing is not recorded,
 * so owners cannot inflate their own view counts.
 */
@Service
public class ListingViewService {

    private final ListingViewRepository listingViews;
    private final ListingsRepository listings;

    public ListingViewService(ListingViewRepository listingViews, ListingsRepository listings) {
        this.listingViews = listingViews;
        this.listings = listings;
    }

    /**
     * Records that the given user opened the listing.
     *
     * @return true when a view was stored, false when the viewer owns the listing
     * @throws IllegalArgumentException when the listing does not exist
     */
    @Transactional
    public boolean recordListingView(Long listingId, User viewer) {
        Optional<Listings> found = listings.findById(listingId);
        if (found.isEmpty()) {
            throw new IllegalArgumentException("Listing not found: " + listingId);
        }
        Listings listing = found.get();
        if (listing.isOwnedBy(viewer)) {
            return false;
        }

        ListingView view = new ListingView();
        view.setListing(listing);
        view.setViewerUserId(viewer == null ? null : viewer.getUserID());
        view.setKind(ListingView.KIND_LISTING);
        listingViews.save(view);
        return true;
    }
}
