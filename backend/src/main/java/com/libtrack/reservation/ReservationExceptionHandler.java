package com.libtrack.reservation;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ReservationController.class)
public class ReservationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ReservationExceptionHandler.class);

    public record ReservationError(String code, String message, Map<String, String> fieldErrors) {
        public ReservationError(String code, String message) {
            this(code, message, null);
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ReservationError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new ReservationError("VALIDATION_ERROR", "Invalid reservation data.", fieldErrors));
    }

    @ExceptionHandler(DuplicateReservationException.class)
    public ResponseEntity<ReservationError> handleDuplicate(DuplicateReservationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ReservationError("DUPLICATE_RESERVATION", ex.getMessage()));
    }

    @ExceptionHandler(BookNotReservableException.class)
    public ResponseEntity<ReservationError> handleNotReservable(BookNotReservableException ex) {
        return ResponseEntity.badRequest().body(new ReservationError("BOOK_NOT_RESERVABLE", ex.getMessage()));
    }

    @ExceptionHandler(ReservationNotFoundException.class)
    public ResponseEntity<ReservationError> handleNotFound(ReservationNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ReservationError("RESERVATION_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedReservationActionException.class)
    public ResponseEntity<ReservationError> handleUnauthorized(UnauthorizedReservationActionException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ReservationError("UNAUTHORIZED_ACTION", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ReservationError> handleGeneral(Exception ex) {
        log.error("Unhandled reservation exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ReservationError("INTERNAL_ERROR", "Could not load reservations. Please try again."));
    }
}
