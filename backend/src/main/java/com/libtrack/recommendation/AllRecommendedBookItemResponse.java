package com.libtrack.recommendation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AllRecommendedBookItemResponse(
        UUID bookId,
        String title,
        String isbn,
        String coverImageUrl,
        List<String> authors,
        List<String> categories,
        Integer publicationYear,
        long distinctFacultyCount,
        long totalRecommendations,
        Double averageRating,
        long reviewCount,
        Instant latestCreatedAt,
        List<ContributingFacultyResponse> contributingFaculty
) {}
