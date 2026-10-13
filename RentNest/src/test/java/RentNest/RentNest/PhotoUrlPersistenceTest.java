package RentNest.RentNest;

import RentNest.dto.RegisterUserDto;
import RentNest.model.User;
import RentNest.repository.UserRepository;
import RentNest.service.AuthenticationService;
import RentNest.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.EmbeddedDatabaseConnection;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false",
        "spring.liquibase.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY,
        connection = EmbeddedDatabaseConnection.H2)
class PhotoUrlPersistenceTest {
    @Autowired private TestEntityManager entityManager;
    @Autowired private UserRepository repository;
    @Autowired private DataSource dataSource;

    private User reload(Long id) {
        entityManager.flush();
        entityManager.clear();
        return repository.findById(id).orElseThrow();
    }

    @Test
    void signupUpdatePreserveAndClearSurviveReload() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode("password")).thenReturn("encoded");
        AuthenticationService authentication =
                new AuthenticationService(repository, mock(AuthenticationManager.class), encoder);
        UserService users = new UserService(repository);
        RegisterUserDto dto = new RegisterUserDto();
        dto.setFullName("Photo User");
        dto.setEmail("photo@example.test");
        dto.setPassword("password");
        dto.setContact("123");
        String photo = "https://example.com/a%20b?x=a+b&y=%25%2F#preview";
        dto.setPhotoURL(" " + photo + " ");
        Long id = authentication.signup(dto).getUserID();
        assertEquals(photo, reload(id).getPhotoURL());

        String prefix = "https://example.com/";
        String maximum = prefix + "a".repeat(255 - prefix.length());
        assertEquals(255, maximum.length());
        users.updateUserData(id, "After", dto.getEmail(), "456", maximum);
        assertEquals(maximum, reload(id).getPhotoURL());
        users.updateUserData(id, "Other", dto.getEmail(), "789");
        assertEquals(maximum, reload(id).getPhotoURL());
        users.updateUserData(id, "Other", dto.getEmail(), "789", " \t");
        assertNull(reload(id).getPhotoURL());
    }

    @Test
    void rejectedUpdateCannotFlushPartialChanges() {
        User user = entityManager.persistAndFlush(new User().setName("Before")
                .setEmail("before@example.test").setContact("123")
                .setPassword("encoded").setPhotoURL("legacy photo"));
        Long id = user.getUserID();
        assertThrows(IllegalArgumentException.class, () -> new UserService(repository)
                .updateUserData(id, "After", "after@example.test", "456", "not a URL"));
        User saved = reload(id);
        assertEquals("Before", saved.getName());
        assertEquals("before@example.test", saved.getEmail());
        assertEquals("123", saved.getContact());
        assertEquals("legacy photo", saved.getPhotoURL());
    }

    @Test
    void isolatedSchemaHasNullable255CharacterPhotoColumn() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertEquals("H2", connection.getMetaData().getDatabaseProductName());
            try (ResultSet columns = connection.getMetaData().getColumns(null, null, "USERS", "PHOTOURL")) {
                assertTrue(columns.next());
                assertEquals(255, columns.getInt("COLUMN_SIZE"));
                assertEquals(java.sql.DatabaseMetaData.columnNullable, columns.getInt("NULLABLE"));
            }
        }
    }
}
