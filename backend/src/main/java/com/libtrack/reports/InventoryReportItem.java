package com.libtrack.reports;

public record InventoryReportItem(
    long totalBooks,
    long totalCopies,
    long availableCopies,
    long onLoanCopies,
    long lostCopies,
    long damagedCopies,
    long withdrawnCopies
) {}
