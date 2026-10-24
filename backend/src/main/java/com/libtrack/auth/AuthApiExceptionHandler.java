package com.libtrack.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthApiExceptionHandler {
    @ExceptionHandler(AccountIdentityConflictException.class)
    ResponseEntity<AuthenticationError> duplicateIdentity(AccountIdentityConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new AuthenticationError("IDENTITY_CONFLICT", exception.getMessage()));
    }

    @ExceptionHandler(AccountNotFoundException.class)
    ResponseEntity<AuthenticationError> accountNotFound(AccountNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new AuthenticationError("ACCOUNT_NOT_FOUND", exception.getMessage()));
    }
}
