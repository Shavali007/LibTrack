package com.libtrack.review;

import java.time.Instant;
import java.util.UUID;

public record BookReviewResponse(
        UUID id,
        UUID bookId,
        String reviewerName,
        int rating,
        String comment,
        Instant createdAt
) {
    public static BookReviewResponse from(BookReview review) {
        String name = null;
        if (review.getReviewer() != null) {
            name = review.getReviewer().getDisplayName();
            if (name == null || name.isBlank()) {
                String email = review.getReviewer().getEmail();
                if (email != null && email.contains("@")) {
                    name = email.substring(0, email.indexOf('@'));
                } else {
                    name = "Verified Reader";
                }
            }
        } else {
            name = "Verified Reader";
        }

        return new BookReviewResponse(
                review.getId(),
                review.getBook().getId(),
                name,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
