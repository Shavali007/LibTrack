package com.libtrack.catalogue;

import java.util.List;
import java.util.UUID;

public record BookSummaryResponse(
        UUID id, String title, String isbn, List<String> authors, List<String> categories,
        String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
        long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
        long damagedCopies, long withdrawnCopies, boolean hasDigitalEdition, String department) {

    public BookSummaryResponse(
            UUID id, String title, String isbn, List<String> authors, List<String> categories,
            String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
            long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
            long damagedCopies, long withdrawnCopies, boolean hasDigitalEdition) {
        this(id, title, isbn, authors, categories, publisher, publicationYear, coverImageUrl,
                circulationPolicy, totalCopies, availableCopies, onLoanCopies, lostCopies,
                damagedCopies, withdrawnCopies, hasDigitalEdition, null);
    }

    public BookSummaryResponse(
            UUID id, String title, String isbn, List<String> authors, List<String> categories,
            String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
            long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
            long damagedCopies, long withdrawnCopies) {
        this(id, title, isbn, authors, categories, publisher, publicationYear, coverImageUrl,
                circulationPolicy, totalCopies, availableCopies, onLoanCopies, lostCopies,
                damagedCopies, withdrawnCopies, false, null);
    }
}
