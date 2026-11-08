package com.libtrack.circulation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LoanReceiptResponse(
    UUID receiptId,
    String receiptNumber,
    UUID loanId,
    Instant generatedAt,
    String formattedGeneratedAt,
    UUID borrowerId,
    String borrowerName,
    String borrowerInstitutionalId,
    String borrowerEmail,
    String borrowerRole,
    UUID bookId,
    String bookTitle,
    String bookAuthors,
    String bookIsbn,
    String copyIdentifier,
    LocalDate issueDate,
    LocalDate dueDate,
    String issuedByName,
    String issuedByEmail,
    String libraryName,
    String universityName,
    String borrowerDepartment
) {
    public LoanReceiptResponse(
        UUID receiptId,
        String receiptNumber,
        UUID loanId,
        Instant generatedAt,
        String formattedGeneratedAt,
        UUID borrowerId,
        String borrowerName,
        String borrowerInstitutionalId,
        String borrowerEmail,
        String borrowerRole,
        UUID bookId,
        String bookTitle,
        String bookAuthors,
        String bookIsbn,
        String copyIdentifier,
        LocalDate issueDate,
        LocalDate dueDate,
        String issuedByName,
        String issuedByEmail,
        String libraryName,
        String universityName
    ) {
        this(receiptId, receiptNumber, loanId, generatedAt, formattedGeneratedAt,
             borrowerId, borrowerName, borrowerInstitutionalId, borrowerEmail, borrowerRole,
             bookId, bookTitle, bookAuthors, bookIsbn, copyIdentifier, issueDate, dueDate,
             issuedByName, issuedByEmail, libraryName, universityName, null);
    }
}
