package com.libtrack.circulation;

import com.libtrack.librarian.MonthlyCirculationOverview;
import java.util.List;

public record CirculationStatsResponse(
    long activeLoans,
    long totalReturnsThisMonth,
    long totalGoodReturns,
    long totalDamagedCopies,
    long totalLostCopies,
    long overdueLoans,
    List<MonthlyCirculationOverview> activityOverTime,
    ReturnConditionDistribution returnConditions,
    MemberCirculationBreakdown memberBreakdown
) {
    public record ReturnConditionDistribution(long good, long damaged, long lost) {}
    public record MemberCirculationBreakdown(long studentActive, long facultyActive, long studentTotal, long facultyTotal) {}
}
