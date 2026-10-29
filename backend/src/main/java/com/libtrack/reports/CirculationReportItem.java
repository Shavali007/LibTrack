package com.libtrack.reports;

public record CirculationReportItem(
    long totalLoans,
    long activeLoans,
    long overdueLoans,
    long returnedLoans
) {}
