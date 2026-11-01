package com.libtrack.auth;

public record RegistrationPendingResponse(String status, String message) {
    public static RegistrationPendingResponse pending() {
        return new RegistrationPendingResponse(
                "PENDING_APPROVAL",
                "Your registration has been submitted successfully. Your account is awaiting librarian verification. You will be able to sign in once your account is approved."
        );
    }
}
