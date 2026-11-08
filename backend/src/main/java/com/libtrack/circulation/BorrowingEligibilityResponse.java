package com.libtrack.circulation;

public record BorrowingEligibilityResponse(
    boolean eligible,
    boolean hasActiveLoan,
    boolean hasActiveRequest,
    String activeRequestStatus,
    boolean hasReturnedHistory,
    String reason
) {
    public static BorrowingEligibilityResponse eligible(boolean hasReturnedHistory) {
        return new BorrowingEligibilityResponse(true, false, false, null, hasReturnedHistory, null);
    }

    public static BorrowingEligibilityResponse ineligible(boolean hasActiveLoan, boolean hasActiveRequest, String requestStatus, boolean hasReturnedHistory, String reason) {
        return new BorrowingEligibilityResponse(false, hasActiveLoan, hasActiveRequest, requestStatus, hasReturnedHistory, reason);
    }
}
