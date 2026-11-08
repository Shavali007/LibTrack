package com.libtrack.recommendation;

import java.time.Instant;
import java.util.UUID;

public record ContributingFacultyResponse(
        UUID recommendationId,
        UUID facultyId,
        String facultyName,
        String department,
        String message,
        Instant createdAt
) {}
