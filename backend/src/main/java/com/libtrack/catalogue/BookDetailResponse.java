package com.libtrack.catalogue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookDetailResponse(
        UUID id, String title, String isbn, String description, List<String> authors, List<String> categories,
        String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
        boolean active, long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
        long damagedCopies, long withdrawnCopies, Instant createdAt, Instant updatedAt,
        boolean hasDigitalEdition, String department) {

    public BookDetailResponse(
            UUID id, String title, String isbn, String description, List<String> authors, List<String> categories,
            String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
            boolean active, long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
            long damagedCopies, long withdrawnCopies, Instant createdAt, Instant updatedAt,
            boolean hasDigitalEdition) {
        this(id, title, isbn, description, authors, categories, publisher, publicationYear, coverImageUrl,
                circulationPolicy, active, totalCopies, availableCopies, onLoanCopies, lostCopies,
                damagedCopies, withdrawnCopies, createdAt, updatedAt, hasDigitalEdition, null);
    }

    public BookDetailResponse(
            UUID id, String title, String isbn, String description, List<String> authors, List<String> categories,
            String publisher, Integer publicationYear, String coverImageUrl, CirculationPolicy circulationPolicy,
            boolean active, long totalCopies, long availableCopies, long onLoanCopies, long lostCopies,
            long damagedCopies, long withdrawnCopies, Instant createdAt, Instant updatedAt) {
        this(id, title, isbn, description, authors, categories, publisher, publicationYear, coverImageUrl,
                circulationPolicy, active, totalCopies, availableCopies, onLoanCopies, lostCopies,
                damagedCopies, withdrawnCopies, createdAt, updatedAt, false, null);
    }
}
