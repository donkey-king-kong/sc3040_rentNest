package RentNest.RentNest;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Use on every test that starts the Spring application.
 *
 * It swaps the real datasource for a disposable in-memory H2 database, so tests never touch the
 * shared Supabase database, and supplies dummy secrets, so tests run from a clean checkout without
 * a local application.properties.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "security.jwt.secret-key=dGVzdC1vbmx5LWp3dC1zZWNyZXQta2V5LTMyLWJ5dGVzISE=",
        "security.jwt.expiration-time=3600000",
        "LTADATAMALL_ACCOUNTKEY=test",
        "URA_ACCESSKEY=test",
        "analytics.currency=SGD",
        "analytics.time-zone=Asia/Singapore"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@AutoConfigureMockMvc
public @interface RentNestIntegrationTest {
}
