package RentNest.RentNest;

import RentNest.controller.AuthenticationController;
import RentNest.dto.LoginUserDto;
import RentNest.dto.RegisterUserDto;
import RentNest.model.User;
import RentNest.service.AuthenticationService;
import RentNest.service.JwtService;
import RentNest.security.LoginResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthenticationControllerTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationService authenticationService;

    @InjectMocks
    private AuthenticationController authenticationController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testRegisterSuccess() {
        RegisterUserDto registerUserDto = new RegisterUserDto();
        registerUserDto.setEmail("test@example.com");
        registerUserDto.setPassword("password");
        registerUserDto.setFullName("Test User");

        User user = new User();
        user.setEmail("test@example.com");

        when(authenticationService.signup(registerUserDto)).thenReturn(user);

        ResponseEntity<?> response = authenticationController.register(registerUserDto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(user, response.getBody());
        verify(authenticationService, times(1)).signup(registerUserDto);
    }

    @Test
    void testRegisterFailure() {
        RegisterUserDto registerUserDto = new RegisterUserDto();
        registerUserDto.setEmail("test@example.com");
        registerUserDto.setPassword("password");
        registerUserDto.setFullName("Test User");

        when(authenticationService.signup(registerUserDto)).thenThrow(new IllegalArgumentException("Invalid user details"));

        ResponseEntity<?> response = authenticationController.register(registerUserDto);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("{message=Invalid user details}", response.getBody());
        verify(authenticationService, times(1)).signup(registerUserDto);
    }

    @Test
    void testLoginSuccess() {
        LoginUserDto loginUserDto = new LoginUserDto();
        loginUserDto.setEmail("test@example.com");
        loginUserDto.setPassword("password");

        User user = new User();
        user.setEmail("test@example.com");

        when(authenticationService.authenticate(loginUserDto)).thenReturn(user);
        when(jwtService.generateToken(user)).thenReturn("jwt_token");
        when(jwtService.getExpirationTime()).thenReturn(3600L);

        ResponseEntity<?> response = authenticationController.authenticate(loginUserDto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        LoginResponse loginResponse = (LoginResponse) response.getBody();
        assertEquals("jwt_token", loginResponse.getToken());
        assertEquals(3600L, loginResponse.getExpiresIn());
        verify(authenticationService, times(1)).authenticate(loginUserDto);
    }

    @Test
    void testLoginBadCredentials() {
        LoginUserDto loginUserDto = new LoginUserDto();
        loginUserDto.setEmail("test@example.com");
        loginUserDto.setPassword("wrong_password");

        when(authenticationService.authenticate(loginUserDto)).thenThrow(new BadCredentialsException("Bad credentials"));

        ResponseEntity<?> response = authenticationController.authenticate(loginUserDto);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Bad credentials", response.getBody());
        verify(authenticationService, times(1)).authenticate(loginUserDto);
    }

    @Test
    void testLoginBannedUser() {
        LoginUserDto loginUserDto = new LoginUserDto();
        loginUserDto.setEmail("test@example.com");
        loginUserDto.setPassword("password");

        when(authenticationService.authenticate(loginUserDto)).thenThrow(new AuthenticationException("This account has been banned") {});

        ResponseEntity<?> response = authenticationController.authenticate(loginUserDto);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("This account has been banned", response.getBody());
        verify(authenticationService, times(1)).authenticate(loginUserDto);
    }
}
