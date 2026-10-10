package RentNest.repository;

import RentNest.model.ListingView;
import RentNest.model.Listings;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * Read-only aggregation queries for analytics. Every owner- or listing-scoped query
 * constrains on the owner in the query itself, so callers cannot widen the scope.
 */
@Repository
public class AnalyticsQueryRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public record RentalRow(Long listingId, String status, Long tenantUserId, Date rentalDate, Date leaseExpiry,
                            Date createdAt, Date acceptedAt, Date terminatedAt, Date listingCreatedAt) {

        /** When the tenancy ends: the recorded termination time if there is one, otherwise the lease expiry. */
        public Date tenancyEnd() {
            return terminatedAt != null ? terminatedAt : leaseExpiry;
        }
    }

    public record PaymentRow(Date date, Long amount) {
    }

    /** Earliest dated record in the authorized scope, including legacy billing dates. */
    public Optional<Instant> findEarliestAnalyticsDate(Long ownerId, Long listingId) {
        String listingFilter = listingId != null ? " WHERE l.listingID = :scopeId"
                : ownerId != null ? " WHERE l.owner.userID = :scopeId" : "";
        String rentalFilter = listingFilter.replace("l.", "r.listings.");
        String paymentFilter = listingFilter.replace("l.", "p.rentals.listings.");
        String viewFilter = listingFilter.replace("l.listingID", "v.listing.listingID")
                .replace("l.owner.userID", "v.listing.owner.userID");
        Long scopeId = listingId != null ? listingId : ownerId;
        List<String> statements = new java.util.ArrayList<>(List.of(
                "SELECT MIN(l.createdAt) FROM Listings l" + listingFilter,
                "SELECT MIN(r.createdAt) FROM Rentals r" + rentalFilter,
                "SELECT MIN(r.rentalDate) FROM Rentals r" + rentalFilter,
                "SELECT MIN(r.acceptedAt) FROM Rentals r" + rentalFilter,
                "SELECT MIN(r.terminatedAt) FROM Rentals r" + rentalFilter,
                "SELECT MIN(p.date) FROM Payment p" + paymentFilter,
                "SELECT MIN(v.viewedAt) FROM ListingView v" + viewFilter));
        if (listingId == null) {
            statements.add("SELECT MIN(u.createdAt) FROM User u"
                    + (ownerId != null ? " WHERE u.userID = :scopeId" : ""));
        }
        return statements.stream().map(statement -> {
            TypedQuery<Date> query = entityManager.createQuery(statement, Date.class);
            if (scopeId != null) query.setParameter("scopeId", scopeId);
            return query.getSingleResult();
        }).filter(java.util.Objects::nonNull).map(Date::toInstant).min(Instant::compareTo);
    }

    // ---------- Listings ----------

    public long countListingsByOwner(Long ownerId) {
        return entityManager.createQuery(
                        "SELECT COUNT(l) FROM Listings l WHERE l.owner.userID = :ownerId", Long.class)
                .setParameter("ownerId", ownerId)
                .getSingleResult();
    }

    public Optional<Listings> findListingOwnedBy(Long listingId, Long ownerId) {
        return entityManager.createQuery(
                        "SELECT l FROM Listings l WHERE l.listingID = :listingId AND l.owner.userID = :ownerId", Listings.class)
                .setParameter("listingId", listingId)
                .setParameter("ownerId", ownerId)
                .getResultStream()
                .findFirst();
    }

    public long countAllListings() {
        return entityManager.createQuery("SELECT COUNT(l) FROM Listings l", Long.class).getSingleResult();
    }

    public long countDistinctListingOwners() {
        return entityManager.createQuery("SELECT COUNT(DISTINCT l.owner.userID) FROM Listings l", Long.class)
                .getSingleResult();
    }

    // ---------- Rentals ----------

    private static final String RENTAL_ROW_SELECT =
            "SELECT new RentNest.repository.AnalyticsQueryRepository$RentalRow(" +
            "r.listings.listingID, r.status, r.tenantUserID, r.rentalDate, r.leaseExpiry, " +
            "r.createdAt, r.acceptedAt, r.terminatedAt, r.listings.createdAt) FROM Rentals r ";

    public List<RentalRow> findRentalRowsByOwner(Long ownerId) {
        return entityManager.createQuery(RENTAL_ROW_SELECT + "WHERE r.listings.owner.userID = :ownerId", RentalRow.class)
                .setParameter("ownerId", ownerId)
                .getResultList();
    }

    public List<RentalRow> findRentalRowsByListing(Long listingId) {
        return entityManager.createQuery(RENTAL_ROW_SELECT + "WHERE r.listings.listingID = :listingId", RentalRow.class)
                .setParameter("listingId", listingId)
                .getResultList();
    }

    public List<RentalRow> findAllRentalRows() {
        return entityManager.createQuery(RENTAL_ROW_SELECT, RentalRow.class).getResultList();
    }

    // ---------- Payments (always period-bounded) ----------

    /** All recorded rent amounts, independent of the selected reporting period. */
    public long sumAllRecordedRentPayments() {
        return entityManager.createQuery("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p", Long.class)
                .getSingleResult();
    }

    public long sumAllRecordedRentPaymentsByOwner(Long ownerId) {
        return entityManager.createQuery(
                        "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
                        "WHERE p.rentals.listings.owner.userID = :ownerId", Long.class)
                .setParameter("ownerId", ownerId)
                .getSingleResult();
    }

    private static final String PAYMENT_ROW_SELECT =
            "SELECT new RentNest.repository.AnalyticsQueryRepository$PaymentRow(p.date, p.amount) FROM Payment p " +
            "WHERE p.date >= :from AND p.date < :to ";

    public List<PaymentRow> findPaymentRowsByOwner(Long ownerId, Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        PAYMENT_ROW_SELECT + "AND p.rentals.listings.owner.userID = :ownerId", PaymentRow.class), from, to)
                .setParameter("ownerId", ownerId)
                .getResultList();
    }

    public List<PaymentRow> findPaymentRowsByListing(Long listingId, Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        PAYMENT_ROW_SELECT + "AND p.rentals.listings.listingID = :listingId", PaymentRow.class), from, to)
                .setParameter("listingId", listingId)
                .getResultList();
    }

    public List<PaymentRow> findAllPaymentRows(Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(PAYMENT_ROW_SELECT, PaymentRow.class), from, to)
                .getResultList();
    }

    private static <T> TypedQuery<T> withPeriod(TypedQuery<T> query, Instant from, Instant to) {
        return query.setParameter("from", Date.from(from)).setParameter("to", Date.from(to));
    }

    // ---------- Listing views (always period-bounded) ----------

    /** All recorded listing visits across the owner's current listings, including repeat visits. */
    public long countAllListingViewsByOwner(Long ownerId) {
        return entityManager.createQuery(
                        "SELECT COUNT(v) FROM ListingView v WHERE v.listing.owner.userID = :ownerId " +
                        "AND v.kind = :kind AND (v.viewerUserId IS NULL OR v.viewerUserId <> :ownerId)", Long.class)
                .setParameter("ownerId", ownerId)
                .setParameter("kind", ListingView.KIND_LISTING)
                .getSingleResult();
    }

    private static final String LISTING_VIEW_WHERE =
            "FROM ListingView v WHERE v.listing.listingID = :listingId AND v.kind = :kind " +
            "AND v.viewedAt >= :from AND v.viewedAt < :to";

    /** Recorded views of the listing in the period, counting repeat visits separately. */
    public long countListingViews(Long listingId, Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        "SELECT COUNT(v) " + LISTING_VIEW_WHERE, Long.class), from, to)
                .setParameter("listingId", listingId)
                .setParameter("kind", ListingView.KIND_LISTING)
                .getSingleResult();
    }

    /** Distinct signed-in viewers in the period. Anonymous views are not counted, since they have no identity. */
    public long countDistinctListingViewers(Long listingId, Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        "SELECT COUNT(DISTINCT v.viewerUserId) " + LISTING_VIEW_WHERE, Long.class), from, to)
                .setParameter("listingId", listingId)
                .setParameter("kind", ListingView.KIND_LISTING)
                .getSingleResult();
    }

    // ---------- Reviews ----------

    /** Returns [average rating (Double, null when no reviews), review count (Long)]. */
    public Object[] findRatingSummaryForUser(Long userId) {
        return entityManager.createQuery(
                        "SELECT AVG(r.rating), COUNT(r) FROM Reviews r WHERE r.user.userID = :userId", Object[].class)
                .setParameter("userId", userId)
                .getSingleResult();
    }

    // ---------- Users ----------

    public long countAllUsers() {
        return entityManager.createQuery("SELECT COUNT(u) FROM User u", Long.class).getSingleResult();
    }

    public long countUsersWithFlag(int flag) {
        return entityManager.createQuery("SELECT COUNT(u) FROM User u WHERE u.flagged = :flag", Long.class)
                .setParameter("flag", flag)
                .getSingleResult();
    }
}
