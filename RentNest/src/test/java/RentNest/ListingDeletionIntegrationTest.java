package RentNest;

import RentNest.model.*;
import RentNest.repository.*;
import RentNest.service.GeocodingService;
import RentNest.service.ListingsService;
import RentNest.service.NearbyAmenitiesService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.sql.init.mode=never"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({ListingsService.class, ListingDeletionRepository.class})
class ListingDeletionIntegrationTest {
    @MockBean GeocodingService geocoding;
    @MockBean NearbyAmenitiesService amenities;
    @Autowired ListingsService service;
    @Autowired UserRepository users;
    @Autowired ListingsRepository listings;
    @Autowired RentalsRepository rentals;
    @Autowired PaymentRepository payments;
    @Autowired RequestsRepository requests;
    @Autowired ChatHistoryRepository chats;
    @Autowired ListingViewRepository views;
    @Autowired ReviewsRepository reviews;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    TransactionTemplate tx;
    User owner, tenant, admin, stranger;
    Listings target, other;

    @BeforeEach void setup() {
        tx = new TransactionTemplate(manager);
        jdbc.execute("CREATE TABLE IF NOT EXISTS listing_nearby_amenities (id BIGINT PRIMARY KEY, listing_id BIGINT REFERENCES listings(listingid) ON DELETE CASCADE)");
        tx.executeWithoutResult(s -> {
            chats.deleteAll(); requests.deleteAll(); payments.deleteAll(); views.deleteAll();
            reviews.deleteAll(); rentals.deleteAll(); listings.deleteAll(); users.deleteAll();
        });
        tx.executeWithoutResult(s -> {
            owner = user("owner", User.ROLE_USER);
            tenant = user("tenant", User.ROLE_USER);
            stranger = user("stranger", User.ROLE_USER);
            admin = user("admin", User.ROLE_ADMIN);
            target = property("Vacant property");
            other = property("Other property");
        });
        as(admin);
    }

    @AfterEach void clearAuth() { SecurityContextHolder.clearContext(); }

    @Test void vacantDeletionCleansDependenciesButPreservesConversationsAndOtherProperties() {
        Rentals ended = rental(target, "terminated");
        Payment paid = payment(ended);
        Requests decision = request(ended);
        ChatHistory offer = chat("Historic offer", ended, null, null);
        ChatHistory termination = chat("Historic termination", null, decision, null);
        ChatHistory enquiry = chat("Can I view the property?", null, null, target);
        tx.executeWithoutResult(s -> chats.findById(enquiry.getMessageID()).orElseThrow().setListingNameSnapshot("Original property name"));
        ListingView targetView = view(target);
        jdbc.update("INSERT INTO listing_nearby_amenities VALUES (1, ?)", target.getListingID());

        Rentals retained = rental(other, "active");
        Payment otherPayment = payment(retained);
        Requests otherRequest = request(retained);
        ChatHistory otherChat = chat("Other offer", retained, otherRequest, other);
        ListingView otherView = view(other);
        jdbc.update("INSERT INTO listing_nearby_amenities VALUES (2, ?)", other.getListingID());

        service.deleteListing(target.getListingID());

        assertFalse(listings.existsById(target.getListingID()));
        assertFalse(rentals.existsById(ended.getRentalID()));
        assertFalse(payments.existsById(paid.getPaymentId()));
        assertFalse(requests.existsById(decision.getRequestID()));
        assertFalse(views.existsById(targetView.getId()));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM listing_nearby_amenities WHERE listing_id = ?", Long.class, target.getListingID()));
        assertEquals(4, chats.count());
        assertDetached(offer, "Historic offer", "Vacant property");
        assertDetached(termination, "Historic termination", "Vacant property");
        assertDetached(enquiry, "Can I view the property?", "Original property name");
        assertTrue(listings.existsById(other.getListingID()));
        assertTrue(rentals.existsById(retained.getRentalID()));
        assertTrue(payments.existsById(otherPayment.getPaymentId()));
        assertTrue(requests.existsById(otherRequest.getRequestID()));
        assertTrue(views.existsById(otherView.getId()));
        assertEquals(retained.getRentalID(), chats.findById(otherChat.getMessageID()).orElseThrow().getRentalId());
        assertEquals(otherRequest.getRequestID(), chats.findById(otherChat.getMessageID()).orElseThrow().getRequestId());
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM listing_nearby_amenities WHERE listing_id = ?", Long.class, other.getListingID()));
        assertEquals(4, users.count());
    }

    @Test void pendingOfferWithoutTenantDoesNotBlockDeletion() {
        Rentals pending = rental(target, "pending");
        ChatHistory offer = chat("Pending offer", pending, null, null);
        service.deleteListing(target.getListingID());
        assertFalse(listings.existsById(target.getListingID()));
        assertFalse(rentals.existsById(pending.getRentalID()));
        assertDetached(offer, "Pending offer", "Vacant property");
    }

    @Test void occupiedPointerBlocksDeletionEvenWithoutRentalRow() {
        tx.executeWithoutResult(s -> listings.findById(target.getListingID()).orElseThrow().setTenant(tenant));
        assertOccupied(() -> service.deleteListing(target.getListingID()));
        assertTrue(listings.existsById(target.getListingID()));
    }

    @Test void activeRentalBlocksDeletionEvenWhenTenantPointerIsMissing() {
        Rentals active = rental(target, "active");
        Payment payment = payment(active);
        ChatHistory offer = chat("Active offer", active, null, null);
        assertOccupied(() -> service.deleteListing(target.getListingID()));
        assertTrue(listings.existsById(target.getListingID()));
        assertTrue(rentals.existsById(active.getRentalID()));
        assertTrue(payments.existsById(payment.getPaymentId()));
        assertEquals(active.getRentalID(), chats.findById(offer.getMessageID()).orElseThrow().getRentalId());
    }

    @Test void unrelatedUserCannotDeleteOrCleanHistory() {
        Rentals ended = rental(target, "terminated");
        Payment payment = payment(ended);
        as(stranger);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.deleteListing(target.getListingID())).getStatusCode().value());
        assertTrue(listings.existsById(target.getListingID()));
        assertTrue(rentals.existsById(ended.getRentalID()));
        assertTrue(payments.existsById(payment.getPaymentId()));
    }

    @Test void listingOwnerCanDeleteVacantHistoryThroughTheSameRule() {
        Rentals ended = rental(target, "terminated");
        as(owner);
        service.deleteListing(target.getListingID());
        assertFalse(listings.existsById(target.getListingID()));
        assertFalse(rentals.existsById(ended.getRentalID()));
    }

    @Test void laterDeleteFailureRollsBackAllEarlierCleanup() {
        Rentals ended = rental(target, "terminated");
        Payment payment = payment(ended);
        Requests request = request(ended);
        ChatHistory offer = chat("Keep original offer", ended, null, null);
        ChatHistory decision = chat("Keep original decision", null, request, null);
        ListingView view = view(target);
        jdbc.execute("CREATE TABLE deletion_guard (listingid BIGINT REFERENCES listings(listingid))");
        try {
            jdbc.update("INSERT INTO deletion_guard VALUES (?)", target.getListingID());
            assertThrows(DataIntegrityViolationException.class, () -> service.deleteListing(target.getListingID()));
            assertTrue(listings.existsById(target.getListingID()));
            assertTrue(rentals.existsById(ended.getRentalID()));
            assertTrue(payments.existsById(payment.getPaymentId()));
            assertTrue(requests.existsById(request.getRequestID()));
            assertTrue(views.existsById(view.getId()));
            assertEquals(ended.getRentalID(), chats.findById(offer.getMessageID()).orElseThrow().getRentalId());
            assertNull(chats.findById(offer.getMessageID()).orElseThrow().getListingNameSnapshot());
            assertEquals(request.getRequestID(), chats.findById(decision.getMessageID()).orElseThrow().getRequestId());
            assertNull(chats.findById(decision.getMessageID()).orElseThrow().getListingNameSnapshot());
        } finally { jdbc.execute("DROP TABLE deletion_guard"); }
    }

    private User user(String name, String role) {
        return users.save(new User().setName(name).setEmail(name + "@example.test").setPassword("test").setRole(role));
    }
    private Listings property(String name) {
        Listings l = new Listings(); l.setOwner(owner); l.setName(name); l.setLocation("Bishan Street 12"); l.setFlagged(true);
        return listings.save(l);
    }
    private Rentals rental(Listings listing, String status) {
        return tx.execute(s -> {
            Rentals r = new Rentals(); r.setListings(listing); r.setTenantUserID(tenant.getUserID()); r.setStatus(status);
            return rentals.save(r);
        });
    }
    private Payment payment(Rentals rental) {
        return tx.execute(s -> { Payment p = new Payment(); p.setRentals(rental); p.setAmount(2500L); p.setDate(new Date()); return payments.save(p); });
    }
    private Requests request(Rentals rental) {
        return tx.execute(s -> { Requests r = new Requests(); r.setRentals(rental); r.setStatus("accepted"); return requests.save(r); });
    }
    private ChatHistory chat(String text, Rentals rental, Requests request, Listings listing) {
        return tx.execute(s -> {
            ChatHistory c = new ChatHistory(); c.setSender(owner); c.setReceiver(tenant); c.setMessage(text); c.setDate(new Date());
            c.setRental(rental); c.setRequest(request); c.setListing(listing); return chats.save(c);
        });
    }
    private ListingView view(Listings listing) {
        return tx.execute(s -> { ListingView v = new ListingView(); v.setListing(listing); v.setViewerUserId(tenant.getUserID()); v.setKind("listing"); return views.save(v); });
    }
    private void as(User user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
    private void assertOccupied(Runnable action) {
        ResponseStatusException e = assertThrows(ResponseStatusException.class, action::run);
        assertEquals(409, e.getStatusCode().value());
        assertEquals("Unable to delete this listing because a tenant is occupying the property.", e.getReason());
    }
    private void assertDetached(ChatHistory original, String text, String name) {
        ChatHistory c = chats.findById(original.getMessageID()).orElseThrow();
        assertEquals(text, c.getMessage()); assertEquals(name, c.getListingNameSnapshot());
        assertEquals("Bishan Street 12", c.getListingAddressSnapshot());
        assertNull(c.getListingId()); assertNull(c.getRentalId()); assertNull(c.getRequestId());
    }
}
