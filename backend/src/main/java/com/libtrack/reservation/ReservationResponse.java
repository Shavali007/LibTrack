package com.libtrack.reservation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReservationResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        List<String> bookAuthors,
        String bookCategory,
        String bookCoverImageUrl,
        Instant reservedOn,
        Long queuePosition,
        ReservationStatus status,
        String statusDisplay,
        String availabilityHoldText,
        Instant holdExpiresAt,
        UUID assignedCopyId,
        UUID borrowRequestId,
        boolean canCancel,
        boolean canBorrowNow
) {}
