package com.libtrack.digital;

import com.libtrack.catalogue.BookNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice(assignableTypes = DigitalEditionController.class)
public class DigitalEditionExceptionHandler {

    @ExceptionHandler(DigitalEditionNotFoundException.class)
    public ResponseEntity<DigitalEditionError> handleNotFound(DigitalEditionNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new DigitalEditionError("DIGITAL_EDITION_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(BookNotFoundException.class)
    public ResponseEntity<DigitalEditionError> handleBookNotFound(BookNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new DigitalEditionError("BOOK_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(InvalidDigitalEditionException.class)
    public ResponseEntity<DigitalEditionError> handleInvalid(InvalidDigitalEditionException ex) {
        return ResponseEntity.badRequest()
                .body(new DigitalEditionError("INVALID_DIGITAL_EDITION", ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<DigitalEditionError> handleMaxSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.badRequest()
                .body(new DigitalEditionError("FILE_TOO_LARGE", "The uploaded file exceeds the maximum allowed upload limit."));
    }

    @ExceptionHandler(DigitalEditionStorageException.class)
    public ResponseEntity<DigitalEditionError> handleStorageError(DigitalEditionStorageException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new DigitalEditionError("STORAGE_ERROR", "The digital edition could not be saved or retrieved."));
    }

    public record DigitalEditionError(String code, String message) {}
}
