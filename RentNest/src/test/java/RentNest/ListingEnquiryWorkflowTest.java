package RentNest;

import RentNest.dto.ChatHistoryDTO;
import RentNest.dto.RentalsDTO;
import RentNest.model.*;
import RentNest.repository.*;
import RentNest.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.sql.init.mode=never"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({RentalsService.class, ChatHistoryService.class, RequestsService.class})
class ListingEnquiryWorkflowTest {
    @Autowired UserRepository users;
    @Autowired ListingsRepository listings;
    @Autowired RentalsRepository rentals;
    @Autowired ChatHistoryRepository chats;
    @Autowired RequestsRepository requests;
    @Autowired ChatHistoryService chatService;
    @Autowired RentalsService rentalService;
    @Autowired RequestsService requestService;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    TransactionTemplate tx;
    User owner, tenant, stranger;
    Long first, second;

    @BeforeEach void setup() {
        tx = new TransactionTemplate(manager);
        tx.executeWithoutResult(s -> {
            chats.deleteAll(); requests.deleteAll(); rentals.deleteAll(); listings.deleteAll(); users.deleteAll();
        });
        tx.executeWithoutResult(s -> {
            owner = users.save(user("owner"));
            tenant = users.save(user("tenant"));
            stranger = users.save(user("stranger"));
            first = property("First property", owner);
            second = property("Second property", owner);
            property("Tenant owns this", tenant);
        });
    }

    @AfterEach void clearAuth() { SecurityContextHolder.clearContext(); }

    @Test void enquiriesPersistSeparateImmutableSnapshotsAndGroupOptions() {
        as(tenant);
        ChatHistory a = chatService.sendMessage(message(first));
        ChatHistory b = chatService.sendMessage(message(second));
        chatService.sendMessage(message(first));
        tx.executeWithoutResult(s -> listings.findById(first).orElseThrow().setName("Renamed"));
        assertEquals("First property", chats.findById(a.getMessageID()).orElseThrow().getListingNameSnapshot());
        assertEquals("Second property", chats.findById(b.getMessageID()).orElseThrow().getListingNameSnapshot());
        as(owner);
        assertEquals(2, rentalService.getOfferOptions(tenant.getUserID()).size());
        assertTrue(rentalService.getOfferOptions(tenant.getUserID()).stream().allMatch(RentalsService.OfferOption::enquired));
    }

    @Test void publicMessagesCannotSpoofSenderRecipientOrSystemLinks() {
        as(tenant);
        ChatHistoryDTO dto = message(first);
        dto.setSender(stranger.getUserID());
        assertStatus(403, () -> chatService.sendMessage(dto));
        dto.setSender(tenant.getUserID());
        dto.setReceiver(stranger.getUserID());
        assertThrows(IllegalArgumentException.class, () -> chatService.sendMessage(dto));
        dto.setReceiver(owner.getUserID());
        dto.setRental(12L);
        assertThrows(IllegalArgumentException.class, () -> chatService.sendMessage(dto));
        assertEquals(0, chats.count());
    }

    @Test void ordinaryMessageHasNoSnapshotAndEnquiryNeedsAuthentication() {
        assertStatus(401, () -> chatService.sendMessage(message(first)));
        as(tenant);
        ChatHistoryDTO dto = message(null);
        ChatHistory saved = chatService.sendMessage(dto);
        assertNull(saved.getListingId());
        assertNull(saved.getListingNameSnapshot());
    }

    @Test void offersRequireOwnerAndPermitRecipientsWhoOwnOtherProperties() {
        as(stranger);
        assertStatus(403, () -> rentalService.createRentalOffer(offer(first), null, stranger.getUserID(), tenant.getUserID()));
        as(owner);
        Rentals saved = rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID());
        assertEquals("pending", saved.getStatus());
        assertNull(saved.getPaymentHistory());
        assertEquals(List.of(second), rentalService.getOfferOptions(tenant.getUserID()).stream().map(RentalsService.OfferOption::listingId).toList());
        assertStatus(409, () -> rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID()));
        assertEquals(1, rentals.count());
        assertEquals(1, chats.count());
    }

    @Test void acceptsExactOfferAndReletsWithoutLosingHistory() {
        as(owner);
        Rentals a = rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID());
        Rentals b = rentalService.createRentalOffer(offer(second), null, owner.getUserID(), tenant.getUserID());
        assertStatus(403, () -> rentalService.reviewRentalOffer(a.getRentalID(), new RentalsDTO()));
        as(tenant);
        rentalService.reviewRentalOffer(b.getRentalID(), new RentalsDTO());
        assertEquals("pending", rentals.findById(a.getRentalID()).orElseThrow().getStatus());
        assertEquals("active", rentals.findById(b.getRentalID()).orElseThrow().getStatus());
        assertStatus(409, () -> rentalService.reviewRentalOffer(b.getRentalID(), new RentalsDTO()));
        as(owner);
        requestService.makeTerminationRequest(b.getRentalID(), 0);
        Long request = requests.findAll().getFirst().getRequestID();
        as(tenant);
        requestService.decideTermination(request, "accept");
        as(owner);
        Rentals next = rentalService.createRentalOffer(offer(second), null, owner.getUserID(), tenant.getUserID());
        assertNotEquals(b.getRentalID(), next.getRentalID());
        assertEquals("terminated", rentals.findById(b.getRentalID()).orElseThrow().getStatus());
        assertEquals(3, rentals.count());
    }

    @Test void simultaneousOffersHaveExactlyOneWinner() throws Exception {
        CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
        Callable<Integer> send = () -> {
            as(owner); ready.countDown(); assertTrue(start.await(10, TimeUnit.SECONDS));
            try {
                rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID());
                return 201;
            } catch (ResponseStatusException e) { return e.getStatusCode().value(); }
            finally { clearAuth(); }
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(send); var b = executor.submit(send);
            assertTrue(ready.await(10, TimeUnit.SECONDS)); start.countDown();
            assertEquals(List.of(201, 409), List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)).stream().sorted().toList());
        }
        assertEquals(1, rentals.count()); assertEquals(1, chats.count());
    }

    @Test void offerAndAcceptanceRollbackWithoutPartialState() {
        as(owner);
        jdbc.execute("ALTER TABLE chathistory ADD CONSTRAINT fail_offer_chat CHECK (rentalid IS NULL)");
        try {
            assertThrows(DataIntegrityViolationException.class, () ->
                    rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID()));
            assertEquals(0, rentals.count());
            assertEquals(0, chats.count());
        } finally {
            jdbc.execute("ALTER TABLE chathistory DROP CONSTRAINT fail_offer_chat");
        }
        Rentals pending = rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID());
        jdbc.execute("ALTER TABLE rentals ADD CONSTRAINT fail_offer_accept CHECK (status <> 'active')");
        try {
            as(tenant);
            assertThrows(DataIntegrityViolationException.class, () ->
                    rentalService.reviewRentalOffer(pending.getRentalID(), new RentalsDTO()));
            assertEquals("pending", rentals.findById(pending.getRentalID()).orElseThrow().getStatus());
            assertNull(tx.execute(s -> listings.findById(first).orElseThrow().getTenantId()));
        } finally {
            jdbc.execute("ALTER TABLE rentals DROP CONSTRAINT fail_offer_accept");
        }
    }

    @Test void unavailablePropertiesAndInvalidTermsCannotProduceOffers() {
        as(owner);
        RentalsDTO invalid = offer(first);
        invalid.setLeaseExpiry(invalid.getRentalDate());
        assertThrows(IllegalArgumentException.class, () ->
                rentalService.createRentalOffer(invalid, null, owner.getUserID(), tenant.getUserID()));
        invalid.setLeaseExpiry(new Date(1_830_000_000_000L));
        invalid.setTenantUserID(stranger.getUserID());
        assertThrows(IllegalArgumentException.class, () ->
                rentalService.createRentalOffer(invalid, null, owner.getUserID(), tenant.getUserID()));
        tx.executeWithoutResult(s -> listings.findById(first).orElseThrow().setFlagged(true));
        assertStatus(409, () -> rentalService.createRentalOffer(offer(first), null, owner.getUserID(), tenant.getUserID()));
        assertEquals(0, rentals.count());
        assertEquals(0, chats.count());
    }

    private User user(String name) { return new User().setName(name).setEmail(name + "@example.test").setPassword("test"); }
    private Long property(String name, User user) {
        Listings l = new Listings(); l.setOwner(user); l.setName(name); l.setLocation("Bishan Street 12"); l.setPrice(3000);
        return listings.save(l).getListingID();
    }
    private void as(User user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
    private ChatHistoryDTO message(Long listing) {
        ChatHistoryDTO dto = new ChatHistoryDTO(); dto.setListingID(listing);
        dto.setSender(tenant.getUserID()); dto.setReceiver(owner.getUserID()); dto.setMessage("Can I arrange a viewing?");
        return dto;
    }
    private RentalsDTO offer(Long listing) {
        RentalsDTO dto = new RentalsDTO(); dto.setListingsID(listing); dto.setTenantUserID(tenant.getUserID());
        dto.setRentalPrice(3000L); dto.setDepositPrice(3000L);
        dto.setRentalDate(new Date(1_800_000_000_000L)); dto.setLeaseExpiry(new Date(1_830_000_000_000L));
        dto.setStatus("pending"); return dto;
    }
    private void assertStatus(int status, Runnable action) {
        assertEquals(status, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }
}
