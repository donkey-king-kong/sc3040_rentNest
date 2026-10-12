package RentNest.RentNest;

import RentNest.dto.LoginUserDto;
import RentNest.dto.RegisterUserDto;
import RentNest.model.User;
import RentNest.repository.UserRepository;
import RentNest.service.AuthenticationService;
import RentNest.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PhotoUrlServiceTest {
    private UserRepository repository;
    private PasswordEncoder encoder;
    private AuthenticationService authentication;
    private UserService users;
    private User existing;

    @BeforeEach
    void setUp() {
        repository = mock(UserRepository.class);
        encoder = mock(PasswordEncoder.class);
        authentication = new AuthenticationService(repository, mock(AuthenticationManager.class), encoder);
        users = new UserService(repository);
        existing = new User().setName("Before").setEmail("before@example.test")
                .setContact("123").setPassword("encoded").setPhotoURL("legacy photo");
    }

    private RegisterUserDto registration(String photo) {
        RegisterUserDto dto = new RegisterUserDto();
        dto.setFullName("New User");
        dto.setEmail("new@example.test");
        dto.setPassword("password");
        dto.setContact("456");
        dto.setPhotoURL(photo);
        return dto;
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \t\n", " https://example.com/a%20b?x=a+b&y=%25#p ", "http://example.com"})
    void signupPersistsOptionalNormalizedPhoto(String photo) {
        when(encoder.encode("password")).thenReturn("encoded");
        when(repository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        User result = authentication.signup(registration(photo));
        assertEquals(photo == null || photo.isBlank() ? null : photo.trim(), result.getPhotoURL());
        assertEquals("New User", result.getName());
        assertEquals("new@example.test", result.getEmail());
        assertEquals("456", result.getContact());
        assertEquals("encoded", result.getPassword());
        verify(repository).save(result);
    }

    @Test
    void invalidSignupDoesNotEncodeOrSave() {
        assertThrows(IllegalArgumentException.class, () -> authentication.signup(registration("not a URL")));
        verifyNoInteractions(encoder);
        verify(repository, never()).save(any());
    }

    @Test
    void duplicateEmailStillRejected() {
        when(repository.existsByEmail("new@example.test")).thenReturn(true);
        var error = assertThrows(IllegalArgumentException.class,
                () -> authentication.signup(registration("https://example.com")));
        assertEquals("Email already exists", error.getMessage());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \t"})
    void blankPasswordStillRejected(String password) {
        RegisterUserDto dto = registration(null);
        dto.setPassword(password);
        var error = assertThrows(IllegalArgumentException.class, () -> authentication.signup(dto));
        assertEquals("Password cannot be left empty", error.getMessage());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \t\n", " https://example.com/new?x=a+b&y=%25#p ", "http://example.com"})
    void updatePreservesReplacesOrClearsPhoto(String photo) {
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        User result = users.updateUserData(1L, "After", "after@example.test", "456", photo).orElseThrow();
        assertEquals(photo == null ? "legacy photo" : photo.isBlank() ? null : photo.trim(), result.getPhotoURL());
        assertEquals("After", result.getName());
        assertEquals("after@example.test", result.getEmail());
        assertEquals("456", result.getContact());
        verify(repository).save(existing);
    }

    @Test
    void legacyFourArgumentCallerPreservesUnvalidatedPhoto() {
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        users.updateUserData(1L, "After", "after@example.test", "456");
        assertEquals("legacy photo", existing.getPhotoURL());
    }

    @Test
    void updateAddsPhotoToUserWithoutOne() {
        existing.setPhotoURL(null);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        users.updateUserData(1L, "After", "after@example.test", "456", "https://example.com/new");
        assertEquals("https://example.com/new", existing.getPhotoURL());
    }

    @ParameterizedTest
    @ValueSource(strings = {"not a URL", "https://user:pass@example.com", "https://example.com/%GG"})
    void invalidUpdateDoesNotMutateAnyFieldsOrSave(String photo) {
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(IllegalArgumentException.class,
                () -> users.updateUserData(1L, "After", "after@example.test", "456", photo));
        assertEquals("Before", existing.getName());
        assertEquals("before@example.test", existing.getEmail());
        assertEquals("123", existing.getContact());
        assertEquals("legacy photo", existing.getPhotoURL());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"https://example.com/photo", "invalid"})
    void missingUserRemainsEmptyEvenWithInvalidPhoto(String photo) {
        assertTrue(users.updateUserData(99L, "After", "after@example.test", "456", photo).isEmpty());
        verify(repository, never()).save(any());
    }

    @Test
    void authenticationStillChecksPasswordAndBanStatus() {
        LoginUserDto dto = new LoginUserDto();
        dto.setEmail("before@example.test");
        dto.setPassword("password");
        when(repository.findByEmail(dto.getEmail())).thenReturn(Optional.of(existing));
        when(encoder.matches("password", "encoded")).thenReturn(true);
        assertSame(existing, authentication.authenticate(dto));
        when(encoder.matches("password", "encoded")).thenReturn(false);
        assertThrows(BadCredentialsException.class, () -> authentication.authenticate(dto));
        existing.setFlagged(2);
        assertEquals("This account has been banned",
                assertThrows(AuthenticationException.class, () -> authentication.authenticate(dto)).getMessage());
    }
}
