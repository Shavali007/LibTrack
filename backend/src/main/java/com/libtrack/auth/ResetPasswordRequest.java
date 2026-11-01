package com.libtrack.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "Reset token is required.")
    String token,

    @NotBlank(message = "New password is required.")
    @Size(max = 72, message = "Password cannot exceed 72 bytes.")
    String newPassword
) {
    @AssertTrue(message = "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character")
    public boolean isPasswordPolicySatisfied() {
        return PasswordPolicy.satisfies(newPassword);
    }

    @Override
    public String toString() {
        return "ResetPasswordRequest[token=[REDACTED], newPassword=[REDACTED]]";
    }
}
