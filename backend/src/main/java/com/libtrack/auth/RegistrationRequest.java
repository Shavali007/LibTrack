package com.libtrack.auth;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String password,
        @NotBlank @Size(max = 72) String confirmPassword,
        @NotNull RegistrationRole role) {

    private static final Pattern UPPERCASE = Pattern.compile(".*[A-Z].*", Pattern.DOTALL);
    private static final Pattern LOWERCASE = Pattern.compile(".*[a-z].*", Pattern.DOTALL);
    private static final Pattern DIGIT = Pattern.compile(".*[0-9].*", Pattern.DOTALL);
    private static final Pattern SPECIAL = Pattern.compile(".*[^A-Za-z0-9].*", Pattern.DOTALL);

    @AssertTrue(message = "Use the institutional email format required for the selected role")
    public boolean isInstitutionalEmailValid() { return InstitutionalEmailPolicy.isValid(role, email); }

    @AssertTrue(message = "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character")
    public boolean isPasswordPolicySatisfied() {
        if (password == null || password.codePointCount(0, password.length()) < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) return false;
        return UPPERCASE.matcher(password).matches() && LOWERCASE.matcher(password).matches()
                && DIGIT.matcher(password).matches() && SPECIAL.matcher(password).matches();
    }

    @AssertTrue(message = "Password confirmation must match")
    public boolean isPasswordConfirmationMatched() { return password != null && password.equals(confirmPassword); }

    @Override public String toString() {
        return "RegistrationRequest[email=" + email + ", password=[REDACTED], confirmPassword=[REDACTED], role=" + role + "]";
    }
}