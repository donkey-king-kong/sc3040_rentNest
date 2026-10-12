package RentNest;

import RentNest.controller.RentalsController;
import RentNest.controller.RequestsController;
import RentNest.controller.TerminationExceptionHandler;
import RentNest.dto.RentalsDTO;
import RentNest.dto.RequestsDTO;
import RentNest.model.ChatHistory;
import RentNest.model.Listings;
import RentNest.model.Rentals;
import RentNest.model.Requests;
import RentNest.model.User;
import RentNest.repository.ChatHistoryRepository;
import RentNest.repository.ListingsRepository;
import RentNest.repository.RentalsRepository;
import RentNest.repository.RequestsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.ChatHistoryService;
import RentNest.service.RentalsService;
import RentNest.service.RequestsService;
import RentNest.service.JwtService;
import RentNest.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Date;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real committed transactions on a replaced, disposable H2 datasource, never the configured database.
@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.sql.init.mode=never",
        "spring.jpa.show-sql=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({RequestsService.class, RentalsService.class, ChatHistoryService.class})
class TerminationWorkflowTest {
    @Autowired RequestsService service;
    @Autowired RentalsService rentalsService;
    @Autowired RequestsRepository requests;
    @Autowired RentalsRepository rentals;
    @Autowired ListingsRepository listings;
    @Autowired UserRepository users;
    @Autowired ChatHistoryRepository chats;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;

    private TransactionTemplate tx;
    private User owner;
    private User tenant;
    private User stranger;
    private Long rentalId;
    private Long listingId;
    private MockMvc mvc;
    private final Date start = new Date(1_700_000_000_000L);
    private final Date expiry = new Date(1_900_000_000_000L);

    @BeforeEach
    void setup() {
        tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            chats.deleteAll();
            requests.deleteAll();
            rentals.deleteAll();
            listings.deleteAll();
            users.deleteAll();
        });
        tx.executeWithoutResult(status -> {
            owner = users.save(user("owner"));
            tenant = users.save(user("tenant"));
            stranger = users.save(user("stranger"));
            Listings listing = new Listings();
            listing.setOwner(owner);
            listing.setTenant(tenant);
            listing.setName("Test lease");
            listing.setPrice(2000);
            listingId = listings.save(listing).getListingID();
            Rentals rental = new Rentals();
            rental.setListings(listing);
            rental.setTenantUserID(tenant.getUserID());
            rental.setStatus("active");
            rental.setRentalPrice(2000L);
            rental.setDepositPrice(3000L);
            rental.setRentalDate(start);
            rental.setLeaseExpiry(expiry);
            rental.setAcceptedAt(start);
            rentalId = rentals.save(rental).getRentalID();
        });
        mvc = MockMvcBuilders.standaloneSetup(new RequestsController(service), new RentalsController(rentalsService))
                .setControllerAdvice(new TerminationExceptionHandler()).build();
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsPendingRequestAndTimestampedChatWithCompatibleResponse() throws Exception {
        authenticate(owner);
        mvc.perform(post("/api/requests/terminationrequest/{id}/0", rentalId))
                .andExpect(status().isCreated())
                .andExpect(content().string("Request and Chat History created successfully"));
        tx.executeWithoutResult(status -> {
            Requests request = requests.findAll().getFirst();
            ChatHistory chat = chats.findAll().getFirst();
            assertEquals("Pending", request.getStatus());
            assertEquals(0, request.getRefundAmount());
            assertEquals(rentalId, request.getRentalId());
            assertEquals(request.getRequestID(), chat.getRequestId());
            assertEquals(owner.getUserID(), chat.getSenderId());
            assertEquals(tenant.getUserID(), chat.getReceiverId());
            assertNotNull(chat.getDate());
            assertNull(chat.getRentalId());
            assertEquals("active", rentals.findById(rentalId).orElseThrow().getStatus());
        });
    }

    @Test
    void acceptsAtomicallyPreservesIdentityAndContractAndRetriesWithoutNewTimestamp() throws Exception {
        Long requestId = createRequest(Long.MAX_VALUE);
        authenticate(tenant);
        mvc.perform(post("/api/requests/{id}/decision", requestId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"accept\",\"tenantUserID\":999,\"refundAmount\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("terminated"))
                .andExpect(jsonPath("$.tenantUserId").value(tenant.getUserID()))
                .andExpect(jsonPath("$.rentalId").value(rentalId))
                .andExpect(jsonPath("$.refundAmount").value(Long.MAX_VALUE));
        Date terminatedAt = rentals.findById(rentalId).orElseThrow().getTerminatedAt();
        assertNotNull(terminatedAt);
        assertEquals("terminated", service.decideTermination(requestId, "accept").getStatus());
        Rentals rental = rentals.findById(rentalId).orElseThrow();
        assertEquals(terminatedAt, rental.getTerminatedAt());
        assertEquals(tenant.getUserID(), rental.getTenantUserID());
        assertEquals(2000L, rental.getRentalPrice());
        assertEquals(3000L, rental.getDepositPrice());
        assertEquals(start, rental.getRentalDate());
        assertEquals(expiry, rental.getLeaseExpiry());
        assertEquals(start, rental.getAcceptedAt());
        assertEquals(listingId, tx.execute(status -> rentals.findById(rentalId).orElseThrow().getListingId()));
        expectStatus(409, () -> service.decideTermination(requestId, "reject"));
    }

    @Test
    void rejectionLeavesRentalActiveAndRetainsImmutableRequest() {
        Long requestId = createRequest(9300);
        authenticate(tenant);
        assertEquals("rejected", service.decideTermination(requestId, "reject").getStatus());
        assertEquals("rejected", service.decideTermination(requestId, "reject").getStatus());
        Rentals rental = rentals.findById(rentalId).orElseThrow();
        assertEquals("active", rental.getStatus());
        assertNull(rental.getTerminatedAt());
        assertEquals(tenant.getUserID(), rental.getTenantUserID());
        expectStatus(409, () -> service.decideTermination(requestId, "accept"));
        authenticate(owner);
        expectStatus(409, () -> service.makeTerminationRequest(rentalId, 20));
        assertEquals(1, requests.count());
        assertEquals(1, chats.count());
    }

    @Test
    void creationRequiresAuthenticatedOwnerAndDecisionsRequireAuthenticatedTenant() {
        expectStatus(401, () -> service.makeTerminationRequest(rentalId, 0));
        for (User actor : List.of(tenant, stranger)) {
            authenticate(actor);
            expectStatus(403, () -> service.makeTerminationRequest(rentalId, 0));
        }
        Long requestId = createRequest(0);
        SecurityContextHolder.clearContext();
        expectStatus(401, () -> service.decideTermination(requestId, "accept"));
        for (User actor : List.of(owner, stranger)) {
            authenticate(actor);
            expectStatus(403, () -> service.decideTermination(requestId, "accept"));
            expectStatus(403, () -> service.decideTermination(requestId, "reject"));
        }
        authenticate(tenant);
        service.decideTermination(requestId, "accept");
        authenticate(owner);
        expectStatus(403, () -> service.decideTermination(requestId, "accept"));
    }

    @Test
    void requestReadsAreParticipantScoped() {
        Long requestId = createRequest(0);
        authenticate(stranger);
        assertTrue(service.getAllRequests().isEmpty());
        expectStatus(403, () -> service.getRequestById(requestId));
        for (User actor : List.of(owner, tenant)) {
            authenticate(actor);
            assertTrue(service.getRequestById(requestId).isPresent());
            assertEquals(1, service.getAllRequests().size());
        }
    }

    @Test
    void requestReadsSerializeLeaseSummaryWithoutOpenSession() throws Exception {
        Long requestId = createRequest(0);
        authenticate(tenant);
        mvc.perform(get("/api/requests/{id}", requestId))
                .andExpect(status().isOk()).andExpect(jsonPath("$.listingName").value("Test lease"))
                .andExpect(jsonPath("$.status").value("Pending"));
        mvc.perform(get("/api/requests"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].listingName").value("Test lease"));
    }

    @Test
    void bearerTokenResolvesRealUserPrincipalForOwnerAndTenant() throws Exception {
        JwtService jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secretKey", Base64.getEncoder().encodeToString(new byte[32]));
        ReflectionTestUtils.setField(jwt, "jwtExpiration", 60_000L);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt,
                email -> users.findByEmail(email).orElseThrow(), (request, response, handler, error) -> null);
        MockMvc authenticatedMvc = MockMvcBuilders.standaloneSetup(new RequestsController(service))
                .setControllerAdvice(new TerminationExceptionHandler()).addFilters(filter).build();
        authenticatedMvc.perform(post("/api/requests/terminationrequest/{id}/0", rentalId)
                        .header("Authorization", "Bearer " + jwt.generateToken(owner)))
                .andExpect(status().isCreated());
        Long requestId = requests.findAll().getFirst().getRequestID();
        for (User actor : List.of(owner, stranger)) {
            SecurityContextHolder.clearContext();
            authenticatedMvc.perform(post("/api/requests/{id}/decision", requestId)
                            .header("Authorization", "Bearer " + jwt.generateToken(actor))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"reject\"}"))
                    .andExpect(status().isForbidden());
        }
        SecurityContextHolder.clearContext();
        authenticatedMvc.perform(post("/api/requests/{id}/decision", requestId)
                        .header("Authorization", "Bearer " + jwt.generateToken(tenant))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"reject\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("rejected"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"pending", "terminated", "rejected", "expired"})
    void creationRequiresActiveRental(String state) {
        setRentalState(state);
        authenticate(owner);
        expectStatus(409, () -> service.makeTerminationRequest(rentalId, 0));
        assertEquals(0, requests.count());
        assertEquals(0, chats.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"accept", "reject"})
    void decisionRequiresActiveRental(String decision) {
        Long requestId = createRequest(0);
        setRentalState("expired");
        authenticate(tenant);
        expectStatus(409, () -> service.decideTermination(requestId, decision));
        assertEquals("Pending", requests.findById(requestId).orElseThrow().getStatus());
    }

    @Test
    void rejectsInvalidLegacyStateRatherThanRewritingHistory() {
        Long requestId = createRequest(0);
        tx.executeWithoutResult(status -> requests.findById(requestId).orElseThrow().setStatus("accepted"));
        authenticate(tenant);
        expectStatus(409, () -> service.decideTermination(requestId, "accept"));
        tx.executeWithoutResult(status -> requests.findById(requestId).orElseThrow().setStatus("terminated"));
        expectStatus(409, () -> service.decideTermination(requestId, "accept"));
        assertEquals("active", rentals.findById(rentalId).orElseThrow().getStatus());
    }

    @Test
    void duplicateCreationReturnsConflictWithoutChangingTermsOrCreatingChat() {
        Long requestId = createRequest(20);
        expectStatus(409, () -> service.makeTerminationRequest(rentalId, 999));
        assertEquals(20, requests.findById(requestId).orElseThrow().getRefundAmount());
        assertEquals(1, requests.count());
        assertEquals(1, chats.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "1.5", "NaN", "Infinity", "9223372036854775808"})
    void invalidRefundReturnsMeaningfulBadRequest(String amount) throws Exception {
        authenticate(owner);
        mvc.perform(post("/api/requests/terminationrequest/{id}/{amount}", rentalId, amount))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        assertEquals(0, requests.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"decision\":null}", "{\"decision\":\"ACCEPT\"}", "{\"decision\":\"decline\"}", "null", "{"})
    void invalidDecisionReturnsBadRequest(String body) throws Exception {
        Long requestId = createRequest(0);
        authenticate(tenant);
        mvc.perform(post("/api/requests/{id}/decision", requestId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        assertEquals("Pending", requests.findById(requestId).orElseThrow().getStatus());
    }

    @Test
    void missingEntitiesAndUnauthorizedCallsHaveMeaningfulHttpErrors() throws Exception {
        mvc.perform(post("/api/requests/terminationrequest/{id}/0", rentalId))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Authentication required"));
        authenticate(owner);
        mvc.perform(post("/api/requests/terminationrequest/99999999/0"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Rental not found"));
        authenticate(tenant);
        mvc.perform(post("/api/requests/terminationrequest/{id}/0", rentalId))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(post("/api/requests/99999999/decision").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"accept\"}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Request not found"));
    }

    @Test
    void legacyMutationsCannotBypassDecisionOrOverwriteTenant() throws Exception {
        Long requestId = createRequest(0);
        authenticate(tenant);
        expectStatus(409, () -> service.createRequest(new RequestsDTO()));
        expectStatus(409, () -> service.updateRequest(requestId, new RequestsDTO()));
        expectStatus(409, () -> service.deleteRequest(requestId));
        RentalsDTO replacement = new RentalsDTO();
        replacement.setTenantUserID(owner.getUserID());
        replacement.setStatus("active");
        expectStatus(409, () -> rentalsService.updateRental(rentalId, replacement));
        expectStatus(409, () -> rentalsService.deleteRental(rentalId));
        mvc.perform(put("/api/rentals/{id}", rentalId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"terminated\",\"tenantUserID\":" + owner.getUserID() + "}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        service.decideTermination(requestId, "accept");
        expectStatus(409, () -> rentalsService.updateRental(rentalId, replacement));
        expectStatus(409, () -> rentalsService.deleteRental(rentalId));
        assertEquals(tenant.getUserID(), rentals.findById(rentalId).orElseThrow().getTenantUserID());
    }

    @Test
    void activeRentalIsProtectedEvenBeforeRequestExistsAndPendingCannotTerminateDirectly() {
        authenticate(owner);
        expectStatus(409, () -> rentalsService.updateRental(rentalId, new RentalsDTO()));
        expectStatus(409, () -> rentalsService.deleteRental(rentalId));
        setRentalState("pending");
        RentalsDTO dto = new RentalsDTO();
        dto.setStatus("terminated");
        expectStatus(409, () -> rentalsService.updateRental(rentalId, dto));
        expectStatus(409, () -> rentalsService.createRental(dto));
    }

    @ParameterizedTest
    @ValueSource(strings = {"active", "terminated", "request-linked", "termination-timestamp"})
    void ownerCanPutPaymentHistoryWithoutChangingProtectedRental(String protection) throws Exception {
        prepareProtectedRental(protection);
        RentalsDTO original = rentalSnapshot();
        RentalsDTO updated = rentalSnapshot();
        updated.setPaymentHistory("October rent received");
        authenticate(owner);

        mvc.perform(put("/api/rentals/{id}", rentalId).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentHistory").value("October rent received"))
                .andExpect(jsonPath("$.status").value(original.getStatus()))
                .andExpect(jsonPath("$.tenantUserID").value(tenant.getUserID()));

        original.setPaymentHistory("October rent received");
        assertRentalMatches(original);
        assertEquals("request-linked".equals(protection) ? 1 : 0, requests.count());
        expectStatus(409, () -> rentalsService.deleteRental(rentalId));
    }

    @ParameterizedTest
    @ValueSource(strings = {"active", "terminated", "request-linked", "termination-timestamp"})
    void paymentHistoryExceptionCannotChangeParticipantsContractOrLifecycle(String protection) throws Exception {
        prepareProtectedRental(protection);
        RentalsDTO original = rentalSnapshot();
        authenticate(owner);
        for (String field : List.of("tenant", "listing", "rentalPrice", "depositPrice",
                "rentalDate", "leaseExpiry", "status", "createdAt", "acceptedAt", "terminatedAt",
                "rentalID", "nullTenant", "nullStatus")) {
            RentalsDTO updated = rentalSnapshot();
            updated.setPaymentHistory("Must not persist");
            switch (field) {
                case "tenant" -> updated.setTenantUserID(stranger.getUserID());
                case "listing" -> updated.setListingsID(listingId + 1);
                case "rentalPrice" -> updated.setRentalPrice(1L);
                case "depositPrice" -> updated.setDepositPrice(1L);
                case "rentalDate" -> updated.setRentalDate(new Date(0));
                case "leaseExpiry" -> updated.setLeaseExpiry(new Date(0));
                case "status" -> updated.setStatus("pending".equals(original.getStatus()) ? "active" : "pending");
                case "createdAt" -> updated.setCreatedAt(new Date(0));
                case "acceptedAt" -> updated.setAcceptedAt(new Date(0));
                case "terminatedAt" -> updated.setTerminatedAt(new Date(0));
                case "rentalID" -> updated.setRentalID(rentalId + 1);
                case "nullTenant" -> updated.setTenantUserID(null);
                case "nullStatus" -> updated.setStatus(null);
                default -> throw new AssertionError(field);
            }
            mvc.perform(put("/api/rentals/{id}", rentalId).contentType(MediaType.APPLICATION_JSON)
                            .content(new ObjectMapper().writeValueAsString(updated)))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
            assertRentalMatches(original);
        }
    }

    @Test
    void paymentHistoryUpdateRequiresAuthenticatedRentalOwner() throws Exception {
        RentalsDTO original = rentalSnapshot();
        RentalsDTO updated = rentalSnapshot();
        updated.setPaymentHistory("Unauthorized payment");
        String body = new ObjectMapper().writeValueAsString(updated);
        mvc.perform(put("/api/rentals/{id}", rentalId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        for (User actor : List.of(tenant, stranger)) {
            authenticate(actor);
            mvc.perform(put("/api/rentals/{id}", rentalId).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isForbidden());
        }
        assertRentalMatches(original);
    }

    @ParameterizedTest
    @ValueSource(strings = {"active", "terminated", "request-linked", "termination-timestamp"})
    void paymentHistoryUpdatePreservesOmittedServerManagedTimestamps(String protection) {
        prepareProtectedRental(protection);
        RentalsDTO original = rentalSnapshot();
        RentalsDTO updated = rentalSnapshot();
        updated.setRentalID(null);
        updated.setCreatedAt(null);
        updated.setAcceptedAt(null);
        updated.setTerminatedAt(null);
        updated.setPaymentHistory("October rent received");
        authenticate(owner);

        assertEquals("October rent received", rentalsService.updateRental(rentalId, updated).getPaymentHistory());
        original.setPaymentHistory("October rent received");
        assertRentalMatches(original);
    }

    private void prepareProtectedRental(String protection) {
        if ("request-linked".equals(protection)) {
            createRequest(0);
            setRentalState("pending");
        } else if ("terminated".equals(protection) || "termination-timestamp".equals(protection)) {
            tx.executeWithoutResult(status -> {
                Rentals rental = rentals.findById(rentalId).orElseThrow();
                rental.setStatus("terminated".equals(protection) ? "terminated" : "pending");
                rental.setTerminatedAt(expiry);
            });
        }
    }

    private RentalsDTO rentalSnapshot() {
        return tx.execute(status -> rentalsService.toRentalsDTO(rentals.findById(rentalId).orElseThrow()));
    }

    private void assertRentalMatches(RentalsDTO expected) {
        ObjectMapper mapper = new ObjectMapper();
        assertEquals(mapper.valueToTree(expected), mapper.valueToTree(rentalSnapshot()));
    }

    @Test
    void creationRollsBackInsertedRequestWhenChatInsertFails() {
        // Force an actual database failure after the IDENTITY request insert.
        jdbc.execute("ALTER TABLE chathistory ADD CONSTRAINT fail_termination_chat CHECK (date IS NULL)");
        try {
            authenticate(owner);
            assertThrows(DataIntegrityViolationException.class, () -> service.makeTerminationRequest(rentalId, 0));
            assertEquals(0, requests.count());
            assertEquals(0, chats.count());
            assertEquals("active", rentals.findById(rentalId).orElseThrow().getStatus());
        } finally {
            jdbc.execute("ALTER TABLE chathistory DROP CONSTRAINT fail_termination_chat");
        }
    }

    @Test
    void acceptanceRollsBackRentalAndTimestampWhenRequestUpdateFails() {
        Long requestId = createRequest(0);
        jdbc.execute("ALTER TABLE request ADD CONSTRAINT fail_termination_decision CHECK (status <> 'terminated')");
        try {
            authenticate(tenant);
            assertThrows(DataIntegrityViolationException.class, () -> service.decideTermination(requestId, "accept"));
            assertEquals("Pending", requests.findById(requestId).orElseThrow().getStatus());
            Rentals rental = rentals.findById(rentalId).orElseThrow();
            assertEquals("active", rental.getStatus());
            assertNull(rental.getTerminatedAt());
            assertEquals(tenant.getUserID(), rental.getTenantUserID());
        } finally {
            jdbc.execute("ALTER TABLE request DROP CONSTRAINT fail_termination_decision");
        }
    }

    @Test
    void concurrentCreationProducesExactlyOneRequestAndChat() throws Exception {
        List<Integer> outcomes = race(
                () -> as(owner, () -> service.makeTerminationRequest(rentalId, 10)),
                () -> as(owner, () -> service.makeTerminationRequest(rentalId, 10)));
        assertEquals(List.of(200, 409), outcomes.stream().sorted().toList());
        assertEquals(1, requests.count());
        assertEquals(1, chats.count());
    }

    @Test
    void concurrentOpposingDecisionsHaveExactlyOneWinner() throws Exception {
        Long requestId = createRequest(0);
        List<Integer> outcomes = race(
                () -> as(tenant, () -> service.decideTermination(requestId, "accept")),
                () -> as(tenant, () -> service.decideTermination(requestId, "reject")));
        assertEquals(List.of(200, 409), outcomes.stream().sorted().toList());
        String state = requests.findById(requestId).orElseThrow().getStatus();
        Rentals rental = rentals.findById(rentalId).orElseThrow();
        assertEquals("terminated".equals(state) ? "terminated" : "active", rental.getStatus());
        assertEquals("terminated".equals(state), rental.getTerminatedAt() != null);
        assertEquals(tenant.getUserID(), rental.getTenantUserID());
    }

    @Test
    void concurrentIdenticalDecisionsBothSucceed() throws Exception {
        Long requestId = createRequest(0);
        assertEquals(List.of(200, 200), race(
                () -> as(tenant, () -> service.decideTermination(requestId, "accept")),
                () -> as(tenant, () -> service.decideTermination(requestId, "accept"))));
        assertEquals("terminated", requests.findById(requestId).orElseThrow().getStatus());
        assertNotNull(rentals.findById(rentalId).orElseThrow().getTerminatedAt());
    }

    private User user(String name) {
        return new User().setName(name).setEmail(name + "@example.test").setPassword("test");
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private Long createRequest(long amount) {
        authenticate(owner);
        service.makeTerminationRequest(rentalId, amount);
        return requests.findAll().getFirst().getRequestID();
    }

    private void setRentalState(String state) {
        tx.executeWithoutResult(status -> rentals.findById(rentalId).orElseThrow().setStatus(state));
    }

    private void expectStatus(int status, Runnable action) {
        assertEquals(status, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }

    private int as(User actor, Runnable action) {
        authenticate(actor);
        try {
            action.run();
            return 200;
        } catch (ResponseStatusException exception) {
            return exception.getStatusCode().value();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private List<Integer> race(Callable<Integer> first, Callable<Integer> second) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = List.of(first, second).stream().map(action -> executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(10, TimeUnit.SECONDS));
                return action.call();
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            return List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
        }
    }
}
