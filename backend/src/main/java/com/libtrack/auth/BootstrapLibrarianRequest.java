package com.libtrack.auth;

import java.nio.charset.StandardCharsets;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record BootstrapLibrarianRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank String password) {
    @AssertTrue(message = "Password must be at least 12 characters and no more than 72 UTF-8 bytes")
    public boolean isPasswordPolicySatisfied() {
        if (password == null) return false;
        return password.codePointCount(0, password.length()) >= 12
                && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    @Override
    public String toString() {
        return "BootstrapLibrarianRequest[email=" + email + ", password=[REDACTED]]";
    }
}
