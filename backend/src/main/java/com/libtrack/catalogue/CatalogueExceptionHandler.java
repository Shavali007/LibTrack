package com.libtrack.catalogue;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CatalogueController.class)
public class CatalogueExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<CatalogueError> invalidBookRequest(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : exception.getBindingResult().getFieldErrors()) {
            String field = switch (error.getField()) {
                case "isbnValid" -> "isbn";
                case "publicationYearValid" -> "publicationYear";
                case "coverImageUrlValid" -> "coverImageUrl";
                default -> error.getField();
            };
            fieldErrors.putIfAbsent(field, error.getDefaultMessage() == null ? "This value is invalid." : error.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new CatalogueError("VALIDATION_ERROR", "Review the highlighted book fields.", fieldErrors));
    }


    @ExceptionHandler(CatalogueConflictException.class)
    ResponseEntity<CatalogueError> conflict(CatalogueConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new CatalogueError("CATALOGUE_CONFLICT", exception.getMessage()));
    }
    @ExceptionHandler(BookNotFoundException.class)
    ResponseEntity<CatalogueError> bookMissing(BookNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new CatalogueError("BOOK_NOT_FOUND", exception.getMessage()));
    }
    @ExceptionHandler(BookCopyNotFoundException.class)
    ResponseEntity<CatalogueError> copyMissing(BookCopyNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new CatalogueError("COPY_NOT_FOUND", exception.getMessage()));
    }
    @ExceptionHandler(InvalidCopyStateException.class)
    ResponseEntity<CatalogueError> copyState(InvalidCopyStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new CatalogueError("COPY_STATE_CONFLICT", exception.getMessage()));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<CatalogueError> invalidArgument(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(new CatalogueError("INVALID_CATALOGUE_QUERY", exception.getMessage()));
    }
    public record CatalogueError(String code, String message, Map<String, String> fieldErrors) {
        public CatalogueError(String code, String message) { this(code, message, Map.of()); }
    }
}
// probe
