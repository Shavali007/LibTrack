package com.libtrack.circulation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record LoanResponse(
    UUID id,
    UUID borrowRequestId,
    UUID bookId,
    String bookTitle,
    String coverImageUrl,
    String copyIdentifier,
    String borrowerEmail,
    LoanStatus status,
    LocalDate issueDate,
    LocalDate dueDate,
    LocalDate actualReturnDate,
    short renewalCount,
    boolean overdue,
    boolean renewalEligible,
    String returnNote,
    List<LoanEventResponse> history,
    String borrowerDisplayName
) {
    public LoanResponse(UUID id, UUID borrowRequestId, UUID bookId, String bookTitle, String coverImageUrl,
                        String copyIdentifier, String borrowerEmail, LoanStatus status, LocalDate issueDate,
                        LocalDate dueDate, LocalDate actualReturnDate, short renewalCount, boolean overdue,
                        boolean renewalEligible, String returnNote, List<LoanEventResponse> history) {
        this(id, borrowRequestId, bookId, bookTitle, coverImageUrl, copyIdentifier, borrowerEmail, status,
             issueDate, dueDate, actualReturnDate, renewalCount, overdue, renewalEligible, returnNote, history, null);
    }
}
