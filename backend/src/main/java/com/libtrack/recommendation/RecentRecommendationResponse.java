package com.libtrack.recommendation;

import java.time.Instant;
import java.util.UUID;

public record RecentRecommendationResponse(
        UUID recommendationId,
        UUID bookId,
        String bookTitle,
        String coverImageUrl,
        UUID facultyId,
        String facultyName,
        String facultyDepartment,
        Instant createdAt
) {}
