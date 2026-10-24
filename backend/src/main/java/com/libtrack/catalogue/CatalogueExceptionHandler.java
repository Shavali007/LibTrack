package com.libtrack.catalogue;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CatalogueExceptionHandler {
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
    public record CatalogueError(String code, String message) {}
}
