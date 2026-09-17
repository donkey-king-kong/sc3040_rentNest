package RentNest.repository;

import RentNest.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query("SELECT p FROM Payment p WHERE p.rentals.rentalID = :rentalID")
    List<Payment> findAllByRentalID(@Param("rentalID") Long rentalID);
}