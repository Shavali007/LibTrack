package com.libtrack.catalogue;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BookCopyCreateRequest(
        @NotBlank @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._/-]{1,99}") String copyIdentifier,
        @Size(max = 120) String location) {}
