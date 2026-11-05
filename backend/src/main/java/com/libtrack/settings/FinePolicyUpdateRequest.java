package com.libtrack.settings;

import java.math.BigDecimal;

import com.libtrack.fines.FinePolicy;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FinePolicyUpdateRequest(
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal dailyFineRate,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal maximumFinePerBook,
        @NotNull @Min(0) Integer gracePeriodDays,
        @NotNull @Min(1) @Max(FinePolicy.MAX_LOAN_PERIOD_DAYS) Integer loanPeriodDays
) {
    public FinePolicy toPolicy() {
        return new FinePolicy(dailyFineRate, maximumFinePerBook, gracePeriodDays, loanPeriodDays);
    }
}
