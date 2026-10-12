package RentNest.RentNest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import RentNest.model.User;
import RentNest.model.Listings;
import RentNest.repository.UserRepository;
import RentNest.repository.ListingsRepository;
import RentNest.service.JwtService;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@RentNestIntegrationTest
@Transactional
class RentNestApplicationTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ListingsRepository listings;
    @Autowired JwtService jwt;

    @Test void recommendationsRequireAuthentication() throws Exception {
        mvc.perform(post("/api/listings/recommendations").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test void authenticatedRecommendationsUsePrincipalAndReturnOnlyPublicListingFields() throws Exception {
        User viewer = users.save(new User().setName("Viewer").setEmail("viewer@test.local").setPassword("test"));
        User owner = users.save(new User().setName("Owner").setEmail("owner@test.local").setPassword("test"));
        Listings available = new Listings(); available.setOwner(owner); available.setPrice(1800);
        available.setType("HDB"); available.setLocation("Bedok"); available.setBeds(2);
        listings.save(available);
        Listings own = new Listings(); own.setOwner(viewer); own.setPrice(1000); listings.save(own);
        String token = jwt.generateToken(viewer);
        mvc.perform(post("/api/listings/recommendations").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"query\":\"HDB in Bedok under 2k\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.recommendations[0].price").value(1800))
                .andExpect(jsonPath("$.recommendations[0].owner").doesNotExist())
                .andExpect(jsonPath("$.recommendations[0].password").doesNotExist());
        mvc.perform(post("/api/listings/recommendations").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"minPrice\":3000,\"maxPrice\":2000}"))
                .andExpect(status().isBadRequest());
    }

    @Test void webPreflightAllowsAuthorizationHeader() throws Exception {
        mvc.perform(options("/api/listings/recommendations").header("Origin", "http://localhost:8081")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "*"));
    }

	@Test
	void contextLoads() {
	}

}
