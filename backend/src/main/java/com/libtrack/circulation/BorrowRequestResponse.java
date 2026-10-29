package com.libtrack.circulation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BorrowRequestResponse(
    UUID id,
    UUID bookId,
    String bookTitle,
    String coverImageUrl,
    String borrowerEmail,
    String borrowerInstitutionalId,
    String borrowerRole,
    BorrowRequestStatus status,
    Instant submittedAt,
    Instant decidedAt,
    String decisionReason,
    List<BorrowRequestEventResponse> history
) {
    public BorrowRequestResponse(UUID id, UUID bookId, String bookTitle, String coverImageUrl, String borrowerEmail,
                                 BorrowRequestStatus status, Instant submittedAt, Instant decidedAt, String decisionReason,
                                 List<BorrowRequestEventResponse> history) {
        this(id, bookId, bookTitle, coverImageUrl, borrowerEmail, null, null, status, submittedAt, decidedAt, decisionReason, history);
    }
}
