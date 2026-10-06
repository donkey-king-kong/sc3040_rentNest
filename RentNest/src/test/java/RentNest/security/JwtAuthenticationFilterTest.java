package RentNest.security;

import RentNest.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    @Test void unresolvedBackendFailureDoesNotBecomeAnEmptySuccess() throws Exception {
        var resolver = mock(HandlerExceptionResolver.class);
        var filter = new JwtAuthenticationFilter(mock(JwtService.class),
                mock(UserDetailsService.class), resolver);
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test");
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        doThrow(new ServletException("Listing query failed")).when(chain).doFilter(request, response);

        filter.doFilter(request, response, chain);

        assertEquals(500, response.getStatus());
    }

    @Test void handledFailureKeepsItsResolvedStatus() throws Exception {
        var resolver = mock(HandlerExceptionResolver.class);
        var filter = new JwtAuthenticationFilter(mock(JwtService.class),
                mock(UserDetailsService.class), resolver);
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test");
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        doThrow(new ServletException("Invalid filters")).when(chain).doFilter(request, response);
        when(resolver.resolveException(eq(request), eq(response), isNull(), any()))
                .thenAnswer(invocation -> {
                    response.setStatus(400);
                    return new ModelAndView();
                });

        filter.doFilter(request, response, chain);

        assertEquals(400, response.getStatus());
    }
}
