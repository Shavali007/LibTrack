package com.libtrack.catalogue;

import java.util.List;
import java.util.UUID;

/** Public catalogue result plus the non-personal activity totals used for ranking. */
public record TrendingBookResponse(
        UUID id, String title, String isbn, List<String> authors, List<String> categories,
        String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
        long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
        long damagedCopies, long withdrawnCopies, boolean hasDigitalEdition,
        long trendingScore, long issuedLoanCount, long activeReservationCount, long directRequestCount) {
}
