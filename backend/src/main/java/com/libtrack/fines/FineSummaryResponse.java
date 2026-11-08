package com.libtrack.fines;

import java.math.BigDecimal;

public record FineSummaryResponse(
        long totalFines,
        long unpaidFines,
        long paidFines,
        BigDecimal totalCollected,
        BigDecimal totalOutstanding,
        long currentlyOverdueLoans
) {
    public FineSummaryResponse(
            long totalFines,
            long unpaidFines,
            long paidFines,
            BigDecimal totalCollected,
            BigDecimal totalOutstanding
    ) {
        this(totalFines, unpaidFines, paidFines, totalCollected, totalOutstanding, 0);
    }
}
