package com.libtrack.reports;

import java.time.LocalDate;
import java.util.UUID;

public record OverdueLoanItem(
    UUID loanId,
    String bookTitle,
    String bookIsbn,
    String copyIdentifier,
    String borrowerName,
    String borrowerEmail,
    String borrowerInstitutionalId,
    LocalDate issueDate,
    LocalDate dueDate,
    long daysOverdue
) {}
