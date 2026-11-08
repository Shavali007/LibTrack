package com.libtrack.auth;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required.")
        String currentPassword,

        @NotBlank(message = "New password is required.")
        @Size(max = 72, message = "Password must not exceed 72 characters.")
        String newPassword,

        @NotBlank(message = "Password confirmation is required.")
        @Size(max = 72, message = "Password confirmation must not exceed 72 characters.")
        String confirmPassword
) {
    private static final Pattern UPPERCASE = Pattern.compile(".*[A-Z].*", Pattern.DOTALL);
    private static final Pattern LOWERCASE = Pattern.compile(".*[a-z].*", Pattern.DOTALL);
    private static final Pattern DIGIT = Pattern.compile(".*[0-9].*", Pattern.DOTALL);
    private static final Pattern SPECIAL = Pattern.compile(".*[^A-Za-z0-9].*", Pattern.DOTALL);

    @AssertTrue(message = "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character")
    public boolean isPasswordPolicySatisfied() {
        if (newPassword == null || newPassword.codePointCount(0, newPassword.length()) < 8 || newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            return false;
        }
        return UPPERCASE.matcher(newPassword).matches()
                && LOWERCASE.matcher(newPassword).matches()
                && DIGIT.matcher(newPassword).matches()
                && SPECIAL.matcher(newPassword).matches();
    }

    @AssertTrue(message = "Password confirmation must match")
    public boolean isPasswordConfirmationMatched() {
        return newPassword != null && newPassword.equals(confirmPassword);
    }
}
