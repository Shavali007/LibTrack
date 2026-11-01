package com.libtrack.librarian;

import jakarta.validation.constraints.NotBlank;

public record RejectMemberRequest(@NotBlank String reason, String remarks) {}
