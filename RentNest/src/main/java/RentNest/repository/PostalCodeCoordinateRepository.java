package RentNest.repository;

import RentNest.model.PostalCodeCoordinate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostalCodeCoordinateRepository extends JpaRepository<PostalCodeCoordinate, String> {
}
