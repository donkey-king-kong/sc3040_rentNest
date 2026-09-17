package RentNest.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import RentNest.dto.LoginUserDto;
import RentNest.dto.RegisterUserDto;
import RentNest.model.User;
import RentNest.repository.UserRepository;

@Service
public class AuthenticationService {
    private final UserRepository userRepository;
    
    private final PasswordEncoder passwordEncoder;
    
    private final AuthenticationManager authenticationManager;

    public AuthenticationService(
        UserRepository userRepository,
        AuthenticationManager authenticationManager,
        PasswordEncoder passwordEncoder
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User signup(RegisterUserDto input) {
        // Check if the email already exists
        if (userRepository.existsByEmail(input.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Check if the password is empty
        if (input.getPassword() == null || input.getPassword().trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be left empty");
        }

        User user = new User()
                .setName(input.getFullName())
                .setEmail(input.getEmail())
                .setPassword(passwordEncoder.encode(input.getPassword()))
                .setContact(input.getContact());

        return userRepository.save(user);
    }


    public User authenticate(LoginUserDto input) {
        User user = userRepository.findByEmail(input.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Email not registered."));
        if (user.getFlagged() == 2) {
            throw new AuthenticationException("This account has been banned") {};
        }
        
        if (!passwordEncoder.matches(input.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Incorrect password");
        }

        return user;
    }
}