package com.libtrack.catalogue;

import java.util.List;
import java.util.UUID;

public record BookSummaryResponse(
        UUID id, String title, String isbn, List<String> authors, List<String> categories,
        String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
        long totalCopies, long availableCopies) {}
