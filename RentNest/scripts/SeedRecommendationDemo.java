import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.sql.*;
import java.util.*;
import java.util.stream.Stream;
import org.springframework.security.crypto.bcrypt.BCrypt;

/** Explicit, transactional demo seed. Preview is the default; --apply inserts missing demo records. */
class SeedRecommendationDemo {
    static final String OWNER = "recommendation-demo-owner@example.test";
    static final String VIEWER = "recommendation-demo-viewer@example.test";
    static final Path CREDENTIALS = Path.of(".recommendation-demo.properties");
    static final String[] PHOTOS = {
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1564078516393-cf04bd966897?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1628592102751-ba83b0314276?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80"
    };
    static final String[] CREDITS = {
        "Photo: deborah cortelazzi / Unsplash, https://unsplash.com/photos/gREquCUXQLI",
        "Photo: Roberto Nickson / Unsplash, https://unsplash.com/photos/rEJxpBskj3Q",
        "Photo: Huy Nguyen / Unsplash, https://unsplash.com/photos/AB-q9lwCVv8",
        "Photo: Francesca Tosolini / Unsplash, https://unsplash.com/photos/tHkJAMcO3QE"
    };
    public static void main(String[] args) throws Exception {
        boolean apply = args.length == 1 && args[0].equals("--apply");
        if (args.length > 0 && !apply && !(args.length == 1 && args[0].equals("--preview")))
            throw new IllegalArgumentException("Use --preview or --apply");
        var rows = Files.readAllLines(Path.of("scripts/recommendation-demo.tsv")).stream()
                .filter(s -> !s.isBlank() && !s.startsWith("#")).map(s -> s.split("\\|", -1)).toList();
        Set<String> names = new HashSet<>();
        for (var row : rows) {
            if (row.length != 8 || row[0].isBlank() || !names.add(row[0])
                    || !List.of("HDB", "Condo", "Landed").contains(row[1])) throw new IllegalArgumentException("Invalid or duplicate demo row");
            for (int i = 3; i <= 6; i++) if (Integer.parseInt(row[i]) <= 0) throw new IllegalArgumentException("Demo values must be positive");
            if (Integer.parseInt(row[7]) < 0 || Integer.parseInt(row[7]) >= PHOTOS.length) throw new IllegalArgumentException("Unknown photo");
        }
        Properties settings = new Properties();
        // Accept the project-root copy, or the one Spring itself reads, so the database
        // credentials only have to exist in one place.
        Path config = Stream.of(Path.of("application.properties"),
                        Path.of("src/main/resources/application.properties"))
                .filter(Files::isReadable).findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No application.properties found in RentNest/ or RentNest/src/main/resources/"));
        try (var reader = Files.newBufferedReader(config)) { settings.load(reader); }
        try (var connection = DriverManager.getConnection(settings.getProperty("spring.datasource.url"),
                settings.getProperty("spring.datasource.username"), settings.getProperty("spring.datasource.password"))) {
            connection.setAutoCommit(false);
            if (!apply) {
                connection.setReadOnly(true);
                int existing = 0;
                try (var statement = connection.prepareStatement("SELECT count(*) FROM listings l JOIN users u ON u.userid=l.owneruserid WHERE u.email=? AND l.description LIKE 'FICTIONAL DEMO:%'")) {
                    statement.setString(1, OWNER); try (var result = statement.executeQuery()) { result.next(); existing = result.getInt(1); }
                }
                System.out.println("Preview: " + rows.size() + " fixture rows; " + existing + " existing listings owned by demo owner. No writes.");
                for (var row : rows) System.out.println(row[0] + " | " + row[2] + " | S$" + row[3] + " | " + row[4] + " beds");
                connection.rollback(); return;
            }
            try {
                // Serialise concurrent runs of this seeder; existing records are never overwritten.
                try (var statement = connection.createStatement()) { statement.execute("SELECT pg_advisory_xact_lock(30402026)"); }
                Properties credentials = new Properties();
                if (Files.exists(CREDENTIALS)) try (var reader = Files.newBufferedReader(CREDENTIALS)) { credentials.load(reader); }
                credentials.putIfAbsent("viewer.email", VIEWER);
                credentials.putIfAbsent("viewer.password", UUID.randomUUID().toString());
                if (!VIEWER.equals(credentials.getProperty("viewer.email"))) throw new IllegalStateException("Unexpected local demo identity");
                // Persist credentials before committing so a failed write cannot lose access to the new account.
                if (!Files.exists(CREDENTIALS)) Files.createFile(CREDENTIALS);
                Files.setPosixFilePermissions(CREDENTIALS, PosixFilePermissions.fromString("rw-------"));
                try (var writer = Files.newBufferedWriter(CREDENTIALS)) { credentials.store(writer, "Local demo viewer credentials; do not commit or share"); }
                long owner = ensureUser(connection, OWNER, "Recommendation Demo Owner", UUID.randomUUID().toString());
                ensureUser(connection, VIEWER, "Recommendation Demo Viewer", credentials.getProperty("viewer.password"));
                int created = 0;
                for (var row : rows) {
                    try (var statement = connection.prepareStatement("SELECT listingid FROM listings WHERE owneruserid=? AND name=?")) {
                        statement.setLong(1, owner); statement.setString(2, row[0]);
                        try (var result = statement.executeQuery()) { if (result.next()) continue; }
                    }
                    int photo = Integer.parseInt(row[7]);
                    try (var statement = connection.prepareStatement("INSERT INTO listings (owneruserid,name,type,location,price,beds,bathroom,size,flagged,description,listingpicture) VALUES (?,?,?,?,?,?,?,?,false,?,?)")) {
                        statement.setLong(1, owner); statement.setString(2, row[0]); statement.setString(3, row[1]); statement.setString(4, row[2]);
                        for (int i = 3; i <= 6; i++) statement.setInt(i + 2, Integer.parseInt(row[i]));
                        statement.setString(9, "FICTIONAL DEMO: invented price/size, no real rental offer or verified address. "
                                + "Stock photo does not depict this property. " + CREDITS[photo]);
                        statement.setString(10, PHOTOS[photo]); created += statement.executeUpdate();
                    }
                }
                connection.commit();
                System.out.println("Committed " + created + " new demo listings; skipped " + (rows.size()-created) + " existing fixtures. Existing accounts/listings were not modified.");
                System.out.println("Local demo viewer credentials: " + CREDENTIALS + " (values not printed).");
            } catch (Exception error) { connection.rollback(); throw error; }
        }
    }
    static long ensureUser(Connection connection, String email, String name, String password) throws Exception {
        try (var statement = connection.prepareStatement("SELECT userid,name FROM users WHERE email=?")) {
            statement.setString(1, email);
            try (var result = statement.executeQuery()) {
                if (result.next()) {
                    if (!name.equals(result.getString(2))) throw new IllegalStateException("Reserved demo email belongs to a different account");
                    return result.getLong(1);
                }
            }
        }
        try (var statement = connection.prepareStatement("INSERT INTO users (name,email,password,flagged) VALUES (?,?,?,0) RETURNING userid")) {
            statement.setString(1,name); statement.setString(2,email); statement.setString(3,BCrypt.hashpw(password,BCrypt.gensalt()));
            try (var result=statement.executeQuery()) { result.next(); return result.getLong(1); }
        }
    }
}
