package com.libtrack.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Display name cannot be empty")
        @Size(min = 1, max = 100, message = "Display name must be between 1 and 100 characters")
        String displayName) {
}
