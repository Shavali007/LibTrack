package com.libtrack.circulation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateConditionRequest(
    @NotNull(message = "Condition is required.")
    ReturnCondition condition,

    @NotBlank(message = "Case note / reason for change is required.")
    @Size(max = 1000, message = "Case note must be at most 1000 characters.")
    String reason
) {}
