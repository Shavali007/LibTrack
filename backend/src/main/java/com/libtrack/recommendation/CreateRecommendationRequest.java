package com.libtrack.recommendation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateRecommendationRequest(
    @NotNull(message = "Book ID is required.")
    UUID bookId,

    @Size(max = 300, message = "Recommendation message must not exceed 300 characters.")
    String message
) {}
