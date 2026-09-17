package RentNest.service;

import java.util.Optional;

import RentNest.model.User;
import RentNest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    public User getUserByEmail(String email) {
        // Find the user by Email
        Optional<User> userOptional = userRepository.findByEmail(email);
        User user = userOptional.get();
        return user;
    }

    public User getUserById(Long userid) {
        // Find the user by Email
        Optional<User> userOptional = userRepository.getUserByUserID(userid);
        User user = userOptional.get();
        return user;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(User user) {
        return userRepository.save(user);
//        Example of user being saved to database
//        {
//            "name": "test9",
//                "email": "test9@example.com",
//                "contact": "999",
//                "photoURL": "photo1",
//                "flagged": 0,
//                "password": "securepassword"
//        }

    }

    // Update Flag
    public Optional<User> updateUserFlagged(Long userID, int flagValue) {
        // Find the user by ID
        Optional<User> userOptional = userRepository.findById(userID);

        // If user exists, update the flagged field and save
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setFlagged(flagValue);  // Set flagged to the desired value
            userRepository.save(user);  // Save the updated user
            return Optional.of(user);
        }

        // Return empty if the user was not found
        return Optional.empty();
    }

    // Get Flagged Users
    public List<User> getFlaggedUser() {
        return userRepository.findByFlagged(1);
    }

    // Update user data
    public Optional<User> updateUserData(Long userID, String name, String email, String contact) {
        Optional<User> userOptional = userRepository.findById(userID);
        
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setName(name)
                .setEmail(email)
                .setContact(contact);
            return Optional.of(userRepository.save(user));
        }
        
        return Optional.empty();
    }
}
