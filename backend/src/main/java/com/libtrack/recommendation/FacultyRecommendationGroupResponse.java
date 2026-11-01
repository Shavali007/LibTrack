package com.libtrack.recommendation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FacultyRecommendationGroupResponse(
    UUID bookId,
    String bookTitle,
    String bookIsbn,
    String bookCoverImageUrl,
    List<String> bookAuthors,
    List<String> bookCategories,
    Integer publicationYear,
    int totalRecommendations,
    List<FacultyRecommendationItem> recommendations
) {
    public record FacultyRecommendationItem(
        UUID recommendationId,
        UUID facultyId,
        String facultyName,
        String facultyEmail,
        String facultyDepartment,
        String message,
        Instant createdAt,
        long helpfulCount,
        boolean markedHelpful
    ) {}
}
