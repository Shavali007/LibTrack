package com.libtrack.notifications;

import java.time.Instant;
import java.util.UUID;

public record NotificationRecord(
    UUID id,
    UUID recipientAccountId,
    String targetRole,
    String title,
    String message,
    String fullMessage,
    String category,
    String relatedEntityType,
    UUID relatedEntityId,
    String actionRoute,
    boolean isRead,
    Instant readAt,
    Instant createdAt,
    NotificationMetadata metadata
) {
    public NotificationRecord(
        UUID id,
        UUID recipientAccountId,
        String targetRole,
        String title,
        String message,
        String category,
        boolean isRead,
        Instant createdAt
    ) {
        this(id, recipientAccountId, targetRole, title, message, null, category, null, null, null, isRead, null, createdAt, null);
    }
}
