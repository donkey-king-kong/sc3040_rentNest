package RentNest.controller;

import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice(assignableTypes = {RequestsController.class, RentalsController.class,
        ChatHistoryController.class, ListingsController.class})
public class TerminationExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(Map.of("message", exception.getReason() == null ? "Request failed" : exception.getReason()));
    }

    @ExceptionHandler({ConcurrencyFailureException.class, DataIntegrityViolationException.class})
    public ResponseEntity<Map<String, String>> handleConflict(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "The rental or request changed. Refresh before retrying."));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, String>> handleInvalidInput(Exception exception) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid input. IDs and refund amounts must be whole numbers within the long range; decision must be 'accept' or 'reject'."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleValidation(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }
}
