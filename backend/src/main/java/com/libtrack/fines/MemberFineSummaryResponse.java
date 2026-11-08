package com.libtrack.fines;

import java.math.BigDecimal;

public record MemberFineSummaryResponse(
        BigDecimal totalOutstanding,
        long unpaidCount,
        BigDecimal totalPaid,
        long paidCount,
        long totalAssessments,
        long currentOverdueCount
) {}
