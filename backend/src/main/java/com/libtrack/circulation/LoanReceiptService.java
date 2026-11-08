package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoanReceiptService {

    private static final Logger log = LoggerFactory.getLogger(LoanReceiptService.class);
    private static final DateTimeFormatter RECEIPT_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter DISPLAY_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a");

    private final LoanReceiptRepository receipts;
    private final LoanRepository loans;
    private final LoanReceiptPdfService pdfService;
    private final Clock clock;

    public LoanReceiptService(
            LoanReceiptRepository receipts,
            LoanRepository loans,
            LoanReceiptPdfService pdfService,
            Clock clock
    ) {
        this.receipts = receipts;
        this.loans = loans;
        this.pdfService = pdfService;
        this.clock = clock;
    }

    @Transactional
    public LoanReceipt getOrCreateReceipt(Loan loan, UserAccount librarian) {
        if (loan == null || loan.getId() == null) {
            throw new IllegalArgumentException("Loan and loan ID must not be null");
        }

        return receipts.findByLoan_Id(loan.getId()).orElseGet(() -> {
            LocalDate issueDate = loan.getCreatedAt() != null
                    ? LocalDate.ofInstant(loan.getCreatedAt(), clock.getZone())
                    : (loan.getIssueDate() != null ? loan.getIssueDate() : LocalDate.now(clock));
            String datePrefix = RECEIPT_DATE_FORMAT.format(issueDate);
            String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            String receiptNumber = "REC-" + datePrefix + "-" + randomSuffix;

            UserAccount issuer = librarian != null ? librarian : loan.getIssuedBy();
            Instant now = clock.instant();
            LoanReceipt newReceipt = new LoanReceipt(loan, receiptNumber, issuer, now);
            try {
                return receipts.saveAndFlush(newReceipt);
            } catch (DataIntegrityViolationException ex) {
                // In case of concurrent generation, fetch the already created receipt
                log.info("Receipt was concurrently generated for loan {}, retrieving existing record", loan.getId());
                return receipts.findByLoan_Id(loan.getId())
                        .orElseThrow(() -> new IllegalStateException("Failed to retrieve concurrent receipt", ex));
            }
        });
    }

    @Transactional
    public LoanReceipt getReceiptForLoan(UUID loanId, UUID requesterId, boolean isLibrarian) {
        Loan loan = loans.findById(loanId).orElseThrow(CirculationNotFoundException::new);
        if (!isLibrarian) {
            if (loan.getBorrower() == null || !loan.getBorrower().getId().equals(requesterId)) {
                throw new AccessDeniedException("You are not authorized to view this book issue receipt.");
            }
        }
        return getOrCreateReceipt(loan, null);
    }

    @Transactional
    public byte[] generateReceiptPdf(UUID loanId, UUID requesterId, boolean isLibrarian) {
        LoanReceipt receipt = getReceiptForLoan(loanId, requesterId, isLibrarian);
        return pdfService.generateReceiptPdf(receipt.getLoan(), receipt, clock.getZone());
    }

    @Transactional(readOnly = true)
    public LoanReceiptResponse getReceiptResponse(UUID loanId, UUID requesterId, boolean isLibrarian) {
        Loan loan = loans.findById(loanId).orElseThrow(CirculationNotFoundException::new);
        if (!isLibrarian) {
            if (loan.getBorrower() == null || !loan.getBorrower().getId().equals(requesterId)) {
                throw new AccessDeniedException("You are not authorized to view this book issue receipt.");
            }
        }
        LoanReceipt receipt = receipts.findByLoan_Id(loan.getId())
                .orElseGet(() -> getOrCreateReceipt(loan, null));
        return toResponse(receipt);
    }

    public LoanReceiptResponse toResponse(LoanReceipt receipt) {
        Loan loan = receipt.getLoan();
        UserAccount borrower = loan.getBorrower();
        Book book = loan.getRequest() != null ? loan.getRequest().getBook() : null;
        String authors = book != null && book.getAuthors() != null
                ? book.getAuthors().stream().map(Author::getName).collect(Collectors.joining(", "))
                : "";

        Instant generatedAt = receipt.getCreatedAt() != null ? receipt.getCreatedAt() : clock.instant();
        String formattedGeneratedAt = DISPLAY_DATE_TIME_FORMAT.format(generatedAt.atZone(clock.getZone()))
                + " (" + clock.getZone().getId() + ")";

        return new LoanReceiptResponse(
                receipt.getId(),
                receipt.getReceiptNumber(),
                loan.getId(),
                generatedAt,
                formattedGeneratedAt,
                borrower != null ? borrower.getId() : null,
                borrower != null ? borrower.getDisplayName() : null,
                borrower != null ? borrower.getInstitutionalId() : null,
                borrower != null ? borrower.getEmail() : null,
                borrower != null && borrower.getRole() != null ? borrower.getRole().name() : null,
                book != null ? book.getId() : null,
                book != null ? book.getTitle() : null,
                authors,
                book != null ? book.getIsbn() : null,
                loan.getCopy() != null ? loan.getCopy().getCopyIdentifier() : null,
                loan.getIssueDate(),
                loan.getDueDate(),
                loan.getIssuedBy() != null ? loan.getIssuedBy().getDisplayName() : null,
                loan.getIssuedBy() != null ? loan.getIssuedBy().getEmail() : null,
                "Central Library",
                "VIT-AP University",
                borrower != null ? borrower.getDepartment() : null
        );
    }
}
