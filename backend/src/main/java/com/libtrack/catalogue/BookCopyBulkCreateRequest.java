package com.libtrack.catalogue;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record BookCopyBulkCreateRequest(
        @NotNull(message = "Number of copies is required")
        @Min(value = 1, message = "Number of copies must be a whole number from 1 to 500")
        @Max(value = 500, message = "Number of copies must be a whole number from 1 to 500")
        @Digits(integer = 3, fraction = 0, message = "Number of copies must be a whole number from 1 to 500")
        BigDecimal numberOfCopies,
        @Size(max = 120) String location) {}
