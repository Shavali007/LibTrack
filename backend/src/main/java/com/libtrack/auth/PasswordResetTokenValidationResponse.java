package com.libtrack.auth;

public record PasswordResetTokenValidationResponse(
        boolean valid,
        String status,
        String message
) {
    public static PasswordResetTokenValidationResponse validToken() {
        return new PasswordResetTokenValidationResponse(true, "VALID", "Token is valid.");
    }

    public static PasswordResetTokenValidationResponse expiredToken() {
        return new PasswordResetTokenValidationResponse(false, "EXPIRED", "This password reset link has expired. Password reset links are valid for 15 minutes.");
    }

    public static PasswordResetTokenValidationResponse alreadyUsedToken() {
        return new PasswordResetTokenValidationResponse(false, "ALREADY_USED", "This password reset link has already been used. Please request a new one.");
    }

    public static PasswordResetTokenValidationResponse invalidToken(String message) {
        return new PasswordResetTokenValidationResponse(false, "INVALID", message);
    }
}

