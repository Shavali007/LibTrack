package com.libtrack.recommendation;

import java.util.List;
import java.util.UUID;

public record TopRecommendedBookResponse(
        UUID bookId,
        String title,
        String coverImageUrl,
        List<String> authors,
        List<String> categories,
        long distinctFacultyCount,
        long totalRecommendations
) {}
