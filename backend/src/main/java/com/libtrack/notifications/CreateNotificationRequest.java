package com.libtrack.notifications;

import java.util.UUID;

import com.libtrack.auth.AccountRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNotificationRequest(
    UUID recipientAccountId,
    AccountRole targetRole,
    @NotBlank @Size(max = 150) String title,
    @NotBlank @Size(max = 1000) String message,
    @NotBlank @Size(max = 50) String category
) {}
