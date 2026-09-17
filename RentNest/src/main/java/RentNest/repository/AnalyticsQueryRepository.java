package RentNest.repository;

import RentNest.model.Listings;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
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

    public long countFlaggedListings() {
        return entityManager.createQuery("SELECT COUNT(l) FROM Listings l WHERE l.flagged = true", Long.class)
                .getSingleResult();
    }

    public long countListingsCreatedByOwner(Long ownerId, Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        "SELECT COUNT(l) FROM Listings l WHERE l.owner.userID = :ownerId " +
                        "AND l.createdAt >= :from AND l.createdAt < :to", Long.class), from, to)
                .setParameter("ownerId", ownerId)
                .getSingleResult();
    }

    public long countListingsCreated(Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        "SELECT COUNT(l) FROM Listings l WHERE l.createdAt >= :from AND l.createdAt < :to", Long.class), from, to)
                .getSingleResult();
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

    // ---------- Reviews ----------

    /** Returns [average rating (Double, null when no reviews), review count (Long)]. */
    public Object[] findRatingSummaryForUser(Long userId) {
        return entityManager.createQuery(
                        "SELECT AVG(r.rating), COUNT(r) FROM Reviews r WHERE r.user.userID = :userId", Object[].class)
                .setParameter("userId", userId)
                .getSingleResult();
    }

    public long countFlaggedReviews() {
        return entityManager.createQuery("SELECT COUNT(r) FROM Reviews r WHERE r.flagged = true", Long.class)
                .getSingleResult();
    }

    // ---------- Users ----------

    public long countAllUsers() {
        return entityManager.createQuery("SELECT COUNT(u) FROM User u", Long.class).getSingleResult();
    }

    public long countUsersCreated(Instant from, Instant to) {
        return withPeriod(entityManager.createQuery(
                        "SELECT COUNT(u) FROM User u WHERE u.createdAt >= :from AND u.createdAt < :to", Long.class), from, to)
                .getSingleResult();
    }

    private static final String OWNS_A_LISTING =
            "EXISTS (SELECT l.listingID FROM Listings l WHERE l.owner.userID = u.userID)";
    private static final String HAS_ACCEPTED_TENANCY =
            "EXISTS (SELECT r.rentalID FROM Rentals r WHERE r.tenantUserID = u.userID AND LOWER(TRIM(r.status)) IN :acceptedStatuses)";

    /** Counts users by whether they own a listing and whether they have been the tenant on an accepted rental. */
    public long countUsersByRole(boolean owner, boolean tenant, Collection<String> acceptedStatuses) {
        String where = (owner ? "" : "NOT ") + OWNS_A_LISTING + " AND " + (tenant ? "" : "NOT ") + HAS_ACCEPTED_TENANCY;
        return entityManager.createQuery("SELECT COUNT(u) FROM User u WHERE " + where, Long.class)
                .setParameter("acceptedStatuses", acceptedStatuses)
                .getSingleResult();
    }

    public long countUsersWithFlag(int flag) {
        return entityManager.createQuery("SELECT COUNT(u) FROM User u WHERE u.flagged = :flag", Long.class)
                .setParameter("flag", flag)
                .getSingleResult();
    }
}
