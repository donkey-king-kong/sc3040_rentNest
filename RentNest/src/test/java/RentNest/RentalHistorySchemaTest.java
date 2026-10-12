package RentNest;

import RentNest.model.Listings;
import RentNest.model.Rentals;
import RentNest.model.User;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class RentalHistorySchemaTest {
    private SessionFactory start(String url) {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.url", url)
                .applySetting("hibernate.connection.username", "sa")
                .applySetting("hibernate.connection.password", "")
                .applySetting("hibernate.hbm2ddl.auto", "update")
                .applySetting("hibernate.hbm2ddl.halt_on_error", "true")
                .applySetting("hibernate.physical_naming_strategy", CamelCaseToUnderscoresNamingStrategy.class.getName())
                .build();
        return new MetadataSources(registry).addAnnotatedClass(User.class)
                .addAnnotatedClass(Listings.class).addAnnotatedClass(Rentals.class)
                .buildMetadata().buildSessionFactory();
    }

    @Test void restartDoesNotRecreateGlobalListingUniqueness() throws Exception {
        String url = "jdbc:h2:mem:rental_history_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        try (var connection = DriverManager.getConnection(url, "sa", "")) {
            Long listingId;
            try (var first = start(url); var session = first.openSession()) {
                var tx = session.beginTransaction();
                User owner = new User().setName("Owner").setEmail("owner@schema.test").setPassword("test");
                session.persist(owner);
                Listings listing = new Listings(); listing.setOwner(owner); session.persist(listing);
                listingId = listing.getListingID();
                Rentals rental = new Rentals(); rental.setListings(listing); rental.setStatus("terminated");
                session.persist(rental); tx.commit();
            }
            try (var restarted = start(url); var session = restarted.openSession()) {
                var tx = session.beginTransaction();
                Rentals next = new Rentals(); next.setListings(session.find(Listings.class, listingId));
                next.setStatus("pending"); session.persist(next); tx.commit();
                assertEquals(2L, session.createQuery("SELECT count(r) FROM Rentals r", Long.class).getSingleResult());
            }
        } finally {
            try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
                statement.execute("SHUTDOWN");
            }
        }
    }
}
