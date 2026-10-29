package com.libtrack.fines;

import java.util.List;

import com.libtrack.reports.OverdueLoanItem;

public record FinesPolicyResponse(
    String status,
    String policyTitle,
    String policyDescription,
    boolean monetaryFinesEnabled,
    long overdueLoansCount,
    List<OverdueLoanItem> overdueLoans
) {}
