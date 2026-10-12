package RentNest.recommendation;

import RentNest.model.Listings;
import RentNest.model.User;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ListingsSchemaTest {
    private static final Set<String> REMOVED_COLUMNS =
            Set.of("ai_summary", "ai_summary_key", "ai_summary_updated_at");

    private SessionFactory start(String url) {
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.url", url)
                .applySetting("hibernate.connection.username", "sa")
                .applySetting("hibernate.connection.password", "")
                .applySetting("hibernate.hbm2ddl.auto", "update")
                .applySetting("hibernate.hbm2ddl.halt_on_error", "true")
                .applySetting("hibernate.physical_naming_strategy",
                        CamelCaseToUnderscoresNamingStrategy.class.getName())
                .build();
        try {
            return new MetadataSources(registry)
                    .addAnnotatedClass(Listings.class).addAnnotatedClass(User.class)
                    .buildMetadata().buildSessionFactory();
        } catch (RuntimeException error) {
            StandardServiceRegistryBuilder.destroy(registry);
            throw error;
        }
    }

    private Set<String> listingColumns(Connection connection) throws Exception {
        Set<String> columns = new HashSet<>();
        try (var result = connection.getMetaData().getColumns(null, "PUBLIC", "LISTINGS", null)) {
            while (result.next()) columns.add(result.getString("COLUMN_NAME").toLowerCase(Locale.ROOT));
        }
        assertFalse(columns.isEmpty());
        return columns;
    }

    @Test void schemaUpdateDoesNotCreateOrRecreateRemovedColumnsAndListingsRemainUsable() throws Exception {
        String url = "jdbc:h2:mem:listing_columns_" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            Long listingId;
            Set<String> expectedColumns;
            try (SessionFactory firstStart = start(url)) {
                expectedColumns = listingColumns(connection);
                assertTrue(expectedColumns.stream().noneMatch(REMOVED_COLUMNS::contains));
                try (var session = firstStart.openSession()) {
                    var transaction = session.beginTransaction();
                    User owner = new User().setName("Owner").setEmail("owner@schema.test").setPassword("test");
                    session.persist(owner);
                    Listings listing = new Listings();
                    listing.setOwner(owner);
                    listing.setName("Preserved listing");
                    listing.setPrice(2500);
                    session.persist(listing);
                    transaction.commit();
                    listingId = listing.getListingID();
                }
            }
            // Simulate an old schema and its removal before the next backend startup.
            try (var statement = connection.createStatement()) {
                statement.execute("ALTER TABLE listings ADD COLUMN ai_summary varchar(600)");
                statement.execute("ALTER TABLE listings ADD COLUMN ai_summary_key varchar(64)");
                statement.execute("ALTER TABLE listings ADD COLUMN ai_summary_updated_at timestamp with time zone");
                assertTrue(listingColumns(connection).containsAll(REMOVED_COLUMNS));
                for (String column : REMOVED_COLUMNS)
                    statement.execute("ALTER TABLE listings DROP COLUMN " + column);
            }
            try (SessionFactory restarted = start(url)) {
                assertEquals(expectedColumns, listingColumns(connection),
                        "ddl-auto=update must not recreate the removed fields on restart");
                try (var session = restarted.openSession()) {
                    var transaction = session.beginTransaction();
                    Listings listing = session.find(Listings.class, listingId);
                    assertEquals("Preserved listing", listing.getName());
                    assertEquals(2500, listing.getPrice());
                    listing.setPrice(2700);
                    transaction.commit();
                    session.clear();
                    assertEquals(2700, session.find(Listings.class, listingId).getPrice());
                }
            }
        } finally {
            try (Connection connection = DriverManager.getConnection(url, "sa", "");
                 var statement = connection.createStatement()) {
                statement.execute("SHUTDOWN");
            }
        }
    }
}
