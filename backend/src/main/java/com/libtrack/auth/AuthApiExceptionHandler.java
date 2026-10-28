package com.libtrack.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {AuthController.class, AccountProvisioningController.class, RegistrationController.class, EmailVerificationController.class})
public class AuthApiExceptionHandler {
    @ExceptionHandler(VerificationDeliveryUnavailableException.class)
    ResponseEntity<AuthenticationError> verificationDeliveryUnavailable(VerificationDeliveryUnavailableException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new AuthenticationError("VERIFICATION_DELIVERY_UNAVAILABLE", "Account registration is temporarily unavailable. Email verification has not been configured."));
    }

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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<RegistrationValidationError> invalidRequest(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error -> {
            String field = switch (error.getField()) {
                case "institutionalEmailValid" -> "email";
                case "passwordPolicySatisfied" -> "password";
                case "passwordConfirmationMatched" -> "confirmPassword";
                default -> error.getField();
            };
            fields.putIfAbsent(field, error.getDefaultMessage());
        });
        return ResponseEntity.badRequest().body(new RegistrationValidationError(
                "VALIDATION_ERROR", "Review the registration fields and try again.", fields));
    }
}