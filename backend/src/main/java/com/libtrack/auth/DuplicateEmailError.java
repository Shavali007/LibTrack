package com.libtrack.auth;

public record DuplicateEmailError(
        String code,
        String message,
        ApprovalStatus existingStatus
) {}
