package com.libtrack.auth;

public record RegistrationPendingResponse(String status, String message) {
    static RegistrationPendingResponse pending() {
        return new RegistrationPendingResponse("PENDING_VERIFICATION",
                "Registration received. Follow the verification link sent to your institutional email before signing in.");
    }
}