package com.libtrack.recommendation;

import jakarta.validation.constraints.Size;

public record UpdateRecommendationRequest(
    @Size(max = 300, message = "Recommendation message must not exceed 300 characters.")
    String message
) {}
