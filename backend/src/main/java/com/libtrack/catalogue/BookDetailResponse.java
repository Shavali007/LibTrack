package com.libtrack.catalogue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookDetailResponse(
        UUID id, String title, String isbn, String description, List<String> authors, List<String> categories,
        String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
        boolean active, long totalCopies, long availableCopies, Instant createdAt, Instant updatedAt) {}
