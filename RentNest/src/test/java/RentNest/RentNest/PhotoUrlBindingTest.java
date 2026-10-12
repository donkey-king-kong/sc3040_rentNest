package RentNest.RentNest;

import RentNest.controller.AuthenticationController;
import RentNest.controller.UserController;
import RentNest.model.User;
import RentNest.repository.ReviewsRepository;
import RentNest.repository.UserRepository;
import RentNest.service.AuthenticationService;
import RentNest.service.JwtService;
import RentNest.service.ListingsService;
import RentNest.service.PhotoUrlValidator;
import RentNest.service.ReviewsService;
import RentNest.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PhotoUrlBindingTest {
    private MockMvc mvc;
    private UserRepository repository;
    private User existing;
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String PHOTO = "https://example.com/a%20b?x=a+b&y=%25%2F#preview";

    @BeforeEach
    void setUp() {
        repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("encoded");
        when(repository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        existing = new User().setName("Before").setEmail("before@example.test")
                .setContact("123").setPassword("encoded").setPhotoURL("legacy photo");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        mvc = MockMvcBuilders.standaloneSetup(
                new AuthenticationController(mock(JwtService.class),
                        new AuthenticationService(repository, mock(AuthenticationManager.class), encoder)),
                new UserController(new UserService(repository), mock(ReviewsRepository.class),
                        mock(ReviewsService.class), mock(ListingsService.class))).build();
    }

    private MockHttpServletRequestBuilder signup(String extraJson) {
        return post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(
                "{\"email\":\"new@example.test\",\"password\":\"password\","
                + "\"fullName\":\"New User\",\"contact\":\"456\"" + extraJson + "}");
    }

    private MockHttpServletRequestBuilder update() {
        return put("/api/users/id/1").param("name", "After")
                .param("email", "after@example.test").param("contact", "456");
    }

    @Test
    void canonicalSignupJsonBindsAndRespondsWithPhotoURL() throws Exception {
        mvc.perform(signup(",\"photoURL\":" + mapper.writeValueAsString(" " + PHOTO + " ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoURL").value(PHOTO))
                .andExpect(jsonPath("$.photoUrl").doesNotExist());
        verify(repository).save(argThat(user -> PHOTO.equals(user.getPhotoURL())));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", ",\"photoURL\":null", ",\"photoURL\":\"\"", ",\"photoURL\":\"  \""})
    void omittedNullAndBlankSignupBindAsNoPhoto(String extraJson) throws Exception {
        mvc.perform(signup(extraJson)).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoURL").value(nullValue()));
        verify(repository).save(argThat(user -> user.getPhotoURL() == null));
    }

    @Test
    void omittedUpdatePreservesLegacyPhoto() throws Exception {
        mvc.perform(update()).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoURL").value("legacy photo"))
                .andExpect(jsonPath("$.name").value("After"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  \t"})
    void blankUpdateClearsPhoto(String photo) throws Exception {
        mvc.perform(update().param("photoURL", photo)).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoURL").value(nullValue()));
        assertNull(existing.getPhotoURL());
    }

    @Test
    void encodedQueryRoundTripsReservedCharactersExactlyOnce() throws Exception {
        URI uri = UriComponentsBuilder.fromPath("/api/users/id/1")
                .queryParam("name", "After").queryParam("email", "after@example.test")
                .queryParam("contact", "456").queryParam("photoURL", "{photo}")
                .encode().buildAndExpand(Map.of("photo", PHOTO)).toUri();
        assertTrue(uri.getRawQuery().contains("%2520"));
        assertTrue(uri.getRawQuery().contains("%2B"));
        assertTrue(uri.getRawQuery().contains("%23"));
        mvc.perform(put(uri)).andExpect(status().isOk())
                .andExpect(jsonPath("$.photoURL").value(PHOTO));
        assertEquals(PHOTO, existing.getPhotoURL());
    }

    @ParameterizedTest
    @ValueSource(strings = {"bad", "https://user:pass@example.com", "https://example.com/%GG"})
    void invalidSignupReturns400MessageWithoutSave(String photo) throws Exception {
        mvc.perform(signup(",\"photoURL\":" + mapper.writeValueAsString(photo)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PhotoUrlValidator.INVALID_MESSAGE));
        verify(repository, never()).save(any());
    }

    @Test
    void invalidUpdateReturns400WithoutPartialMutation() throws Exception {
        mvc.perform(update().param("photoURL", "https://example.com/a b"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(PhotoUrlValidator.INVALID_MESSAGE));
        assertEquals("Before", existing.getName());
        assertEquals("before@example.test", existing.getEmail());
        assertEquals("123", existing.getContact());
        assertEquals("legacy photo", existing.getPhotoURL());
        verify(repository, never()).save(any());
    }

    @Test
    void missingUserStillReturns404() throws Exception {
        mvc.perform(put("/api/users/id/99").param("name", "After")
                        .param("email", "after@example.test").param("contact", "456")
                        .param("photoURL", "invalid"))
                .andExpect(status().isNotFound());
    }

    @Test
    void existingRequiredUpdateParametersRemainRequired() throws Exception {
        mvc.perform(put("/api/users/id/1").param("photoURL", PHOTO)).andExpect(status().isBadRequest());
        verify(repository, never()).save(any());
    }
}
