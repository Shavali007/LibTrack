package com.libtrack.settings;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LibraryInfoRecord(
        @NotBlank @Size(max = 200) String libraryName,
        @NotBlank @Email @Size(max = 200) String contactEmail,
        @NotBlank @Size(max = 50) String contactPhone,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 50) String openTime,
        @NotBlank @Size(max = 50) String closeTime
) {}
