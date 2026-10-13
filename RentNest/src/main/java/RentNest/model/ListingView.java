package RentNest.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.Date;

/**
 * One recorded view of a listing. Rows are only inserted, never updated or deleted.
 *
 * The time is taken from the server clock, never from the request, so a client cannot
 * backdate or forge a view.
 */
@Entity
@Table(name = "listing_view")
public class ListingView {

    /** A view of the listing detail page. */
    public static final String KIND_LISTING = "listing";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cascade on delete, so an admin removing a reported listing is not blocked by its view history.
    // Declared here as well as in the migration, so the test schema matches the real one.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listingid", referencedColumnName = "listingid", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Listings listing;

    /** The signed-in viewer. Null would mean an anonymous view; listings currently require a login. */
    @Column(name = "userid")
    private Long viewerUserId;

    @Column(name = "viewed_at", nullable = false, updatable = false)
    private Date viewedAt;

    @Column(name = "kind", nullable = false)
    private String kind;

    @PrePersist
    void recordViewTime() {
        if (viewedAt == null) {
            viewedAt = new Date();
        }
    }

    public Long getId() {
        return id;
    }

    @JsonIgnore
    public Listings getListing() {
        return listing;
    }

    @JsonProperty("listingId")
    public Long getListingId() {
        return listing != null ? listing.getListingID() : null;
    }

    public Long getViewerUserId() {
        return viewerUserId;
    }

    public Date getViewedAt() {
        return viewedAt;
    }

    public String getKind() {
        return kind;
    }

    public void setListing(Listings listing) {
        this.listing = listing;
    }

    public void setViewerUserId(Long viewerUserId) {
        this.viewerUserId = viewerUserId;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }
}
