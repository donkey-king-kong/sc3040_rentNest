package RentNest.repository;

import java.util.List;
import java.util.Optional;

import RentNest.model.User;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByFlagged(int flagged);

    Optional<User> findByEmail(String email);

    Optional<User> getUserByUserID(Long userid);

    boolean existsByEmail(String email);
}
