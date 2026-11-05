package com.libtrack.fines;

import java.util.List;
import java.math.BigDecimal;

import com.libtrack.reports.OverdueLoanItem;

public record FinesPolicyResponse(
    String status,
    String policyTitle,
    String policyDescription,
    boolean monetaryFinesEnabled,
    BigDecimal dailyFineRate,
    BigDecimal maximumFinePerBook,
    int gracePeriodDays,
    int loanPeriodDays,
    boolean configured,
    long overdueLoansCount,
    List<OverdueLoanItem> overdueLoans
) {}
