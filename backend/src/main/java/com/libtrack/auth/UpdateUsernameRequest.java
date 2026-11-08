package com.libtrack.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateUsernameRequest(
        @NotBlank(message = "Username cannot be empty.")
        @Size(min = 2, max = 50, message = "Username must be between 2 and 50 characters.")
        @Pattern(regexp = "^[a-zA-Z0-9._ -]+$", message = "Username can contain letters, numbers, spaces, dots, underscores, and hyphens.")
        String username
) {
    public String cleanUsername() {
        return username != null ? username.strip() : null;
    }
}
