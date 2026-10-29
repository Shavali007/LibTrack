package com.libtrack.catalogue;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InventoryReconciliationRequest(
        @NotNull(message = "Target quantity is required.")
        @Min(value = 0, message = "Target quantity must be zero or greater.")
        @Max(value = 1000, message = "Target quantity cannot exceed 1000 copies.")
        Integer targetQuantity,

        @Size(max = 120, message = "Location must be at most 120 characters.")
        String location
) {}
