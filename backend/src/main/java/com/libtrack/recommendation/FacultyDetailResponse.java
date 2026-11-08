package com.libtrack.recommendation;

import java.util.List;
import java.util.UUID;

public record FacultyDetailResponse(
        UUID id,
        String displayName,
        String email,
        String department,
        String designation,
        String institutionalId,
        long recommendationCount,
        List<FacultyBookItemResponse> books
) {}
