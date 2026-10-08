package RentNest.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class ReviewSchemaConfig {

    @Bean
    public ApplicationRunner expandReviewTextColumn(JdbcTemplate jdbcTemplate) {
        return args -> jdbcTemplate.execute("ALTER TABLE reviews ALTER COLUMN text TYPE TEXT");
    }
}
