package com.libtrack.review;

import java.util.UUID;

public record ReviewEligibilityResponse(
        UUID bookId,
        boolean eligible,
        boolean hasBorrowHistory,
        boolean hasBorrowed,
        boolean hasDigitalAccess,
        boolean alreadyReviewed,
        boolean hasReviewed,
        String reason
) {
    public static ReviewEligibilityResponse eligible(UUID bookId, boolean hasBorrow, boolean hasDigital) {
        return new ReviewEligibilityResponse(bookId, true, hasBorrow, hasBorrow, hasDigital, false, false, null);
    }

    public static ReviewEligibilityResponse alreadyReviewed(UUID bookId, boolean hasBorrow, boolean hasDigital) {
        return new ReviewEligibilityResponse(
                bookId,
                false,
                hasBorrow,
                hasBorrow,
                hasDigital,
                true,
                true,
                "You have already reviewed this book."
        );
    }

    public static ReviewEligibilityResponse notEligible(UUID bookId, boolean hasBorrow, boolean hasDigital) {
        return new ReviewEligibilityResponse(
                bookId,
                false,
                hasBorrow,
                hasBorrow,
                hasDigital,
                false,
                false,
                "You can review this book after borrowing it or accessing its digital edition."
        );
    }
}
