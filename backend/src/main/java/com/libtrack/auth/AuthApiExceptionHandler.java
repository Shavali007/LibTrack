package com.libtrack.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {AuthController.class, AccountProvisioningController.class, RegistrationController.class, EmailVerificationController.class, PasswordResetController.class})
public class AuthApiExceptionHandler {
    @ExceptionHandler(VerificationDeliveryUnavailableException.class)
    ResponseEntity<AuthenticationError> verificationDeliveryUnavailable(VerificationDeliveryUnavailableException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new AuthenticationError("VERIFICATION_DELIVERY_UNAVAILABLE", "Account registration is temporarily unavailable. Email verification has not been configured."));
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    ResponseEntity<AuthenticationError> invalidPasswordResetToken(InvalidPasswordResetTokenException exception) {
        return ResponseEntity.badRequest()
                .body(new AuthenticationError("INVALID_OR_EXPIRED_TOKEN", exception.getMessage()));
    }

    @ExceptionHandler(com.libtrack.common.email.EmailDeliveryException.class)
    ResponseEntity<AuthenticationError> emailDeliveryFailed(com.libtrack.common.email.EmailDeliveryException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new AuthenticationError("EMAIL_DELIVERY_FAILED", exception.getMessage()));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    ResponseEntity<DuplicateEmailError> duplicateEmail(EmailAlreadyExistsException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new DuplicateEmailError("EMAIL_ALREADY_EXISTS", exception.getMessage(), exception.getExistingStatus()));
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
            String message = error.getDefaultMessage();
            if ("institutionalEmailValid".equals(error.getField())) {
                Object target = exception.getBindingResult().getTarget();
                if (target instanceof RegistrationRequest reg && reg.role() == RegistrationRole.FACULTY) {
                    message = "Enter a valid VIT-AP faculty email address.";
                } else {
                    message = "Enter a valid VIT-AP student email address.";
                }
            }
            fields.putIfAbsent(field, message);
        });
        return ResponseEntity.badRequest().body(new RegistrationValidationError(
                "VALIDATION_ERROR", "Review the form fields and try again.", fields));
    }
}