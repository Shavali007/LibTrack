package com.libtrack.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FeedbackSubmitRequest(
    @NotBlank @Size(max = 50) String category,
    @NotBlank @Size(max = 200) String subject,
    @NotBlank @Size(max = 4000) String message
) {}
