package com.libtrack.review;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.libtrack.review")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class BookReviewExceptionHandler {

    @ExceptionHandler(IneligibleReviewException.class)
    public ResponseEntity<Map<String, String>> handleIneligible(IneligibleReviewException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "code", "INELIGIBLE_REVIEW",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(DuplicateReviewException.class)
    public ResponseEntity<Map<String, String>> handleDuplicate(DuplicateReviewException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "DUPLICATE_REVIEW",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(InvalidReviewException.class)
    public ResponseEntity<Map<String, String>> handleInvalid(InvalidReviewException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "code", "INVALID_REVIEW",
                "message", ex.getMessage()
        ));
    }
}
