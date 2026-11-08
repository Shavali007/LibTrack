package com.libtrack.recommendation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FacultyBookItemResponse(
        UUID recommendationId,
        UUID bookId,
        String title,
        String isbn,
        String coverImageUrl,
        List<String> authors,
        List<String> categories,
        Integer publicationYear,
        Double averageRating,
        long reviewCount,
        String message,
        Instant createdAt,
        long helpfulCount,
        boolean markedHelpful
) {}
