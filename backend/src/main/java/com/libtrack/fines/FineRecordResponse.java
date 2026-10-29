package com.libtrack.fines;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record FineRecordResponse(
        UUID id,
        UUID loanId,
        UUID borrowerId,
        String borrowerName,
        String borrowerEmail,
        String borrowerInstitutionalId,
        UUID bookId,
        String bookTitle,
        String bookIsbn,
        String copyIdentifier,
        LocalDate issueDate,
        LocalDate dueDate,
        LocalDate actualReturnDate,
        String loanStatus,
        BigDecimal dailyRate,
        BigDecimal maxFine,
        int overdueDays,
        BigDecimal fineAmount,
        FineStatus status,
        Instant assessedAt,
        Instant paidAt,
        List<FinePaymentResponse> payments
) {}
