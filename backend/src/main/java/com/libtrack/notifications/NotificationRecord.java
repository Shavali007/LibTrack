package com.libtrack.notifications;

import java.time.Instant;
import java.util.UUID;

public record NotificationRecord(
    UUID id,
    UUID recipientAccountId,
    String targetRole,
    String title,
    String message,
    String category,
    boolean isRead,
    Instant createdAt
) {}
