package com.libtrack.auth;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RegistrationRequest(
        @Size(max = 100) String username,
        @Size(max = 100) String fullName,
        @Size(max = 100) String institutionalId,
        @NotBlank @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String password,
        @NotBlank @Size(max = 72) String confirmPassword,
        @NotNull RegistrationRole role,
        String department) {

    public RegistrationRequest(
            String fullName,
            String institutionalId,
            String email,
            String password,
            String confirmPassword,
            RegistrationRole role) {
        this(fullName, fullName, institutionalId, email, password, confirmPassword, role, null);
    }

    public RegistrationRequest(
            String fullName,
            String institutionalId,
            String email,
            String password,
            String confirmPassword,
            RegistrationRole role,
            String department) {
        this(fullName, fullName, institutionalId, email, password, confirmPassword, role, department);
    }

    public String effectiveUsername() {
        if (username != null && !username.isBlank()) return username.strip();
        if (fullName != null && !fullName.isBlank()) return fullName.strip();
        return null;
    }

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

    @AssertTrue(message = "Department is required and must be one of the four approved departments: Computer Science and Engineering, Electronics and Communication Engineering, Electrical and Electronics Engineering, Mechanical Engineering")
    public boolean isDepartmentValid() {
        if (role == RegistrationRole.STUDENT || role == RegistrationRole.FACULTY) {
            return department != null && Department.isValid(department);
        }
        return true;
    }

    @Override public String toString() {
        return "RegistrationRequest[username=" + effectiveUsername() + ", email=" + email + ", password=[REDACTED], confirmPassword=[REDACTED], role=" + role + ", department=" + department + "]";
    }
}
