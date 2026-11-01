package com.libtrack.recommendation;

import com.libtrack.catalogue.BookNotFoundException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = RecommendationController.class)
public class RecommendationExceptionHandler {

    public record RecommendationError(String code, String message, Map<String, String> fieldErrors) {
        public RecommendationError(String code, String message) {
            this(code, message, null);
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RecommendationError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new RecommendationError("VALIDATION_ERROR", "Invalid recommendation data.", fieldErrors));
    }

    @ExceptionHandler(DuplicateRecommendationException.class)
    public ResponseEntity<RecommendationError> handleDuplicate(DuplicateRecommendationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new RecommendationError("DUPLICATE_RECOMMENDATION", ex.getMessage()));
    }

    @ExceptionHandler(RecommendationNotFoundException.class)
    public ResponseEntity<RecommendationError> handleNotFound(RecommendationNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new RecommendationError("RECOMMENDATION_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(BookNotFoundException.class)
    public ResponseEntity<RecommendationError> handleBookNotFound(BookNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new RecommendationError("BOOK_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedRecommendationActionException.class)
    public ResponseEntity<RecommendationError> handleUnauthorized(UnauthorizedRecommendationActionException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new RecommendationError("UNAUTHORIZED_ACTION", ex.getMessage()));
    }

    @ExceptionHandler(InvalidRecommendationException.class)
    public ResponseEntity<RecommendationError> handleInvalid(InvalidRecommendationException ex) {
        return ResponseEntity.badRequest().body(new RecommendationError("INVALID_RECOMMENDATION", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<RecommendationError> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new RecommendationError("DUPLICATE_RECOMMENDATION", "You have already recommended this book."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<RecommendationError> handleGeneral(Exception ex) throws Exception {
        if (ex instanceof org.springframework.security.access.AccessDeniedException
                || ex instanceof org.springframework.security.core.AuthenticationException) {
            throw ex;
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new RecommendationError("INTERNAL_ERROR", ex.getMessage() != null ? ex.getMessage() : "An unexpected server error occurred."));
    }
}
