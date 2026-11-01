package com.libtrack.review;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

public record BookReviewSummaryResponse(
        UUID bookId,
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Double averageRating,
        long totalReviews,
        long reviewCount
) {
    public static BookReviewSummaryResponse of(UUID bookId, Double rawAverage, long totalReviews) {
        if (totalReviews == 0 || rawAverage == null) {
            return new BookReviewSummaryResponse(bookId, null, 0, 0);
        }
        double rounded = BigDecimal.valueOf(rawAverage)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
        return new BookReviewSummaryResponse(bookId, rounded, totalReviews, totalReviews);
    }
}
