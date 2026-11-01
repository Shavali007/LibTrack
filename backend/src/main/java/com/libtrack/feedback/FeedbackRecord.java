package com.libtrack.feedback;

import java.time.Instant;
import java.util.UUID;

public record FeedbackRecord(
    UUID id,
    UUID accountId,
    String memberEmail,
    String institutionalId,
    String role,
    String category,
    String subject,
    String message,
    Instant createdAt,
    String memberDisplayName
) {
    public FeedbackRecord(UUID id, UUID accountId, String memberEmail, String institutionalId,
                          String role, String category, String subject, String message, Instant createdAt) {
        this(id, accountId, memberEmail, institutionalId, role, category, subject, message, createdAt, null);
    }
}
