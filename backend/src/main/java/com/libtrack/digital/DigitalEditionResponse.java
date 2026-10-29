package com.libtrack.digital;

import java.time.Instant;
import java.util.UUID;

public record DigitalEditionResponse(
        UUID id,
        UUID bookId,
        String originalFilename,
        String contentType,
        long fileSize,
        String editionLabel,
        Instant uploadedAt
) {}
