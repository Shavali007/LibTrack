package com.libtrack.recommendation;

import java.util.UUID;

public record FacultyDirectoryItemResponse(
        UUID id,
        String displayName,
        String email,
        String department,
        String designation,
        String institutionalId,
        long recommendationCount
) {}
