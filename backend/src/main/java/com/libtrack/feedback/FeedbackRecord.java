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
    Instant createdAt
) {}
