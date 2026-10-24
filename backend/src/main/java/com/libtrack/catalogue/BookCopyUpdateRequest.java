package com.libtrack.catalogue;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BookCopyUpdateRequest(
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._/-]{1,99}") @Size(max = 100) String copyIdentifier,
        @Size(max = 120) String location,
        @NotNull ManageableCopyStatus status) {}
