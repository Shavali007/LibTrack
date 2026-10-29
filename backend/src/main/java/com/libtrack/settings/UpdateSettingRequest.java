package com.libtrack.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateSettingRequest(
    @NotBlank @Size(max = 255) String value
) {}
