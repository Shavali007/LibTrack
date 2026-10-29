package com.libtrack.reports;

import java.util.List;

public record ReportSummaryResponse(
    InventoryReportItem inventory,
    CirculationReportItem circulation,
    List<OverdueLoanItem> overdueLoans,
    List<TopBorrowedBookItem> topBooks
) {}
