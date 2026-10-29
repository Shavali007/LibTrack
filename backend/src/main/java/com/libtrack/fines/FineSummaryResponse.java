package com.libtrack.fines;

import java.math.BigDecimal;

public record FineSummaryResponse(
        long totalFines,
        long unpaidFines,
        long paidFines,
        BigDecimal totalCollected,
        BigDecimal totalOutstanding
) {}
