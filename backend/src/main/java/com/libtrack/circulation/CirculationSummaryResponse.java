package com.libtrack.circulation;

public record CirculationSummaryResponse(
    long activeLoans,
    long totalTransactions,
    long totalReturnsThisMonth,
    long damagedCopies,
    long lostCopies,
    long historyTotalCount,
    long historyGoodCount,
    long historyDamagedCount,
    long historyLostCount
) {
    public CirculationSummaryResponse(long activeLoans, long totalReturnsThisMonth, long damagedCopies, long lostCopies) {
        this(activeLoans, activeLoans + totalReturnsThisMonth + damagedCopies + lostCopies,
             totalReturnsThisMonth, damagedCopies, lostCopies,
             totalReturnsThisMonth + damagedCopies + lostCopies, totalReturnsThisMonth, damagedCopies, lostCopies);
    }
}
