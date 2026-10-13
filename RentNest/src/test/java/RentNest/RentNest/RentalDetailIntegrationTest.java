package RentNest.RentNest;

import RentNest.model.*;
import RentNest.repository.*;
import RentNest.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RentNestIntegrationTest
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class RentalDetailIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ListingsRepository listings;
    @Autowired RentalsRepository rentals;
    @Autowired PaymentRepository payments;
    @Autowired JwtService jwt;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory factory;
    User owner, tenant, outsider;
    Listings property;
    Rentals rental;

    @BeforeEach
    void setup() {
        owner = user("Owner");
        tenant = user("Tenant");
        outsider = user("Other");
        property = new Listings();
        property.setOwner(owner);
        property.setTenant(tenant);
        property.setName("PRIVATE_PROPERTY");
        property.setPrice(3000);
        listings.save(property);
        rental = new Rentals();
        rental.setListings(property);
        rental.setTenantUserID(tenant.getUserID());
        rental.setStatus("active");
        rental.setRentalPrice(3000L);
        rental.setRentalDate(date(LocalDate.now().withDayOfMonth(1).minusMonths(2)));
        rental.setLeaseExpiry(date(LocalDate.now().plusMonths(6)));
        rentals.save(rental);
    }

    User user(String name) {
        return users.save(new User().setName(name).setEmail(UUID.randomUUID() + "@test.local")
                .setPassword("test-only").setRole(User.ROLE_USER));
    }
    Date date(LocalDate date) { return Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant()); }
    String auth(User user) { return "Bearer " + jwt.generateToken(user); }
    String propertyPath() { return "/api/owner/listings/" + property.getListingID() + "/rental-info"; }
    String summaryPath() { return "/api/owner/listings/" + property.getListingID() + "/tenants/" + tenant.getUserID(); }
    String paymentsPath() { return "/api/owner/rentals/" + rental.getRentalID() + "/payments"; }
    void payment(Date date) {
        Payment payment = new Payment();
        payment.setRentals(rental);
        payment.setAmount(3000L);
        payment.setDate(date);
        payments.save(payment);
    }

    @Test void propertyProjectionIncludesProfilesAndVacantListings() throws Exception {
        mvc.perform(get(propertyPath()).header("Authorization", auth(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ownerName").value("Owner"))
                .andExpect(jsonPath("$.tenantName").value("Tenant")).andExpect(jsonPath("$.price").value(3000))
                .andExpect(jsonPath("$.description").doesNotExist()).andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(header().string("Cache-Control", "no-store"));
        property.setTenant(null);
        mvc.perform(get(propertyPath()).header("Authorization", auth(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tenantId").isEmpty());
    }

    @Test void summaryUsesAuthenticatedOwnerAndCurrentTenant() throws Exception {
        mvc.perform(get(summaryPath()).param("ownerId", outsider.getUserID().toString()).header("Authorization", auth(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rentalID").value(rental.getRentalID()))
                .andExpect(jsonPath("$.ownerUserId").value(owner.getUserID()))
                .andExpect(jsonPath("$.tenantUserID").value(tenant.getUserID()))
                .andExpect(jsonPath("$.tenantName").value("Tenant"))
                .andExpect(jsonPath("$.payments").doesNotExist()).andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test void unauthorizedAndMissingResourcesDoNotLeakData() throws Exception {
        for (String path : new String[]{propertyPath(), summaryPath(), paymentsPath()}) {
            mvc.perform(get(path)).andExpect(status().isForbidden());
            for (User actor : new User[]{tenant, outsider}) {
                mvc.perform(get(path).header("Authorization", auth(actor))).andExpect(status().isNotFound());
            }
        }
        mvc.perform(get("/api/owner/listings/999999/rental-info").header("Authorization", auth(owner)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/owner/listings/0/rental-info").header("Authorization", auth(owner)))
                .andExpect(status().isBadRequest());
    }

    @Test void pendingEndedAndChangedTenanciesCannotLoadPrivateSummaryOrPayments() throws Exception {
        for (String status : new String[]{"pending", "terminated"}) {
            rental.setStatus(status);
            mvc.perform(get(summaryPath()).header("Authorization", auth(owner))).andExpect(status().isNotFound());
            mvc.perform(get(paymentsPath()).header("Authorization", auth(owner))).andExpect(status().isNotFound());
        }
        rental.setStatus("active");
        property.setTenant(outsider);
        mvc.perform(get(summaryPath()).header("Authorization", auth(owner))).andExpect(status().isNotFound());
        mvc.perform(get(paymentsPath()).header("Authorization", auth(owner))).andExpect(status().isNotFound());
    }

    @Test void emptyPaymentHistoryStillHasOutstandingMonths() throws Exception {
        mvc.perform(get(paymentsPath()).header("Authorization", auth(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.payments.length()").value(0))
                .andExpect(jsonPath("$.outstandingMonths.length()").value(3))
                .andExpect(jsonPath("$.totalOutstandingAmount").value(9000));
    }

    @Test void paidMonthRemovedAndHistorySorted() throws Exception {
        payment(date(LocalDate.now().minusMonths(1).withDayOfMonth(1)));
        payment(date(LocalDate.now().withDayOfMonth(1)));
        mvc.perform(get(paymentsPath()).header("Authorization", auth(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.payments.length()").value(2))
                .andExpect(jsonPath("$.outstandingMonths.length()").value(1))
                .andExpect(jsonPath("$.totalOutstandingAmount").value(3000));
    }

    @Test void invalidDatesProduceAnErrorNotZeroOutstanding() throws Exception {
        rental.setRentalDate(null);
        mvc.perform(get(paymentsPath()).header("Authorization", auth(owner)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test void detailQueryCountsAreBoundedAndPaymentsFetchedOnce() throws Exception {
        em.flush();
        em.clear();
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        try {
            for (String path : new String[]{propertyPath(), summaryPath(), paymentsPath()}) {
                stats.clear();
                mvc.perform(get(path).header("Authorization", auth(owner))).andExpect(status().isOk());
                assertEquals(path.equals(paymentsPath()) ? 3 : 2, stats.getPrepareStatementCount(), path);
                em.clear();
            }
            for (int i = 0; i < 30; i++) payment(date(LocalDate.now().minusMonths(i)));
            em.flush();
            em.clear();
            stats.clear();
            mvc.perform(get(paymentsPath()).header("Authorization", auth(owner)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.payments.length()").value(30));
            assertEquals(3, stats.getPrepareStatementCount());
        } finally { stats.setStatisticsEnabled(false); }
    }

    @Test void correlationLogsExcludePropertyAndPaymentData(CapturedOutput output) throws Exception {
        mvc.perform(get(summaryPath()).servletPath(summaryPath()).header("Authorization", auth(owner))
                        .header("X-Rental-Request-Id", "detail-test-1"))
                .andExpect(status().isOk()).andExpect(header().string("X-Rental-Request-Id", "detail-test-1"));
        assertTrue(output.getOut().contains("requestId=detail-test-1 operation=summary"));
        assertTrue(output.getOut().contains("requestId=detail-test-1 status=200"));
        assertFalse(output.getOut().contains("PRIVATE_PROPERTY"));
        mvc.perform(get(summaryPath()).servletPath(summaryPath()).header("X-Rental-Request-Id", "unsafe_value"))
                .andExpect(status().isForbidden())
                .andDo(result -> assertNotEquals("unsafe_value", result.getResponse().getHeader("X-Rental-Request-Id")));
        assertFalse(output.getOut().contains("unsafe_value"));
    }

    @Test void webCorrelationHeaderAllowed() throws Exception {
        mvc.perform(options(summaryPath()).header("Origin", "http://localhost:8081")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,X-Rental-Request-Id"))
                .andExpect(status().isOk()).andExpect(header().exists("Access-Control-Allow-Headers"));
    }
}
