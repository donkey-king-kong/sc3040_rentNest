package RentNest.RentNest;

import RentNest.model.Listings;
import RentNest.repository.ListingsRepository;
import RentNest.service.ApiService;
import RentNest.service.NearbyAmenitiesService;
import RentNest.service.NearbyAmenitiesService.NearbyAmenitiesResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class NearbyAmenitiesServiceTest {

    @Mock
    private ListingsRepository listingsRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ApiService apiService;

    private NearbyAmenitiesService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new NearbyAmenitiesService(listingsRepository, jdbcTemplate, apiService);
        when(jdbcTemplate.queryForList(anyString(), eq(5L))).thenReturn(List.of());
    }

    @Test
    public void testEmptyResultBecomesReadyAfterPrecomputeFinishes() throws InterruptedException {
        // Listing without coordinates: the precompute stores nothing.
        when(listingsRepository.findById(5L)).thenReturn(Optional.of(new Listings()));

        assertEquals("LOADING", service.getPrecomputedOrStart(5L).status());

        NearbyAmenitiesResponse response = null;
        for (int i = 0; i < 50; i++) {
            response = service.getPrecomputedOrStart(5L);
            if ("READY".equals(response.status())) break;
            Thread.sleep(50);
        }

        assertEquals("READY", response.status());
        assertTrue(response.amenities().isEmpty());
        verify(listingsRepository, times(1)).findById(5L);
    }
}
