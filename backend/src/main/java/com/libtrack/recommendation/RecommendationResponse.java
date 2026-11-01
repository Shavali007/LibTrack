package com.libtrack.recommendation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RecommendationResponse(
    UUID id,
    UUID bookId,
    String bookTitle,
    String bookIsbn,
    String bookCoverImageUrl,
    List<String> bookAuthors,
    List<String> bookCategories,
    Integer publicationYear,
    UUID facultyId,
    String facultyName,
    String facultyEmail,
    String facultyDepartment,
    String message,
    String status,
    Instant createdAt,
    Instant updatedAt,
    Instant withdrawnAt,
    long helpfulCount,
    boolean markedHelpful
) {}
