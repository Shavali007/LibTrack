package com.libtrack.reports;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;
import com.libtrack.circulation.TopBorrowedBookProjection;

@Service
public class ReportService {
    private final BookRepository bookRepository;
    private final BookCopyRepository copyRepository;
    private final LoanRepository loanRepository;
    private final Clock clock;

    public ReportService(BookRepository bookRepository,
                         BookCopyRepository copyRepository,
                         LoanRepository loanRepository,
                         Clock clock) {
        this.bookRepository = bookRepository;
        this.copyRepository = copyRepository;
        this.loanRepository = loanRepository;
        this.clock = clock;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary() {
        LocalDate today = LocalDate.now(clock);

        // 1. Inventory Report
        long totalBooks = bookRepository.count();
        long totalCopies = copyRepository.count();
        long availableCopies = copyRepository.countByStatus(CopyStatus.AVAILABLE);
        long onLoanCopies = copyRepository.countByStatus(CopyStatus.ON_LOAN);
        long lostCopies = copyRepository.countByStatus(CopyStatus.LOST);
        long damagedCopies = copyRepository.countByStatus(CopyStatus.DAMAGED);
        long withdrawnCopies = copyRepository.countByStatus(CopyStatus.WITHDRAWN);

        InventoryReportItem inventory = new InventoryReportItem(
                totalBooks, totalCopies, availableCopies, onLoanCopies, lostCopies, damagedCopies, withdrawnCopies
        );

        // 2. Circulation Report
        long totalLoans = loanRepository.count();
        long activeLoans = loanRepository.countByStatus(LoanStatus.ACTIVE);
        long overdueLoansCount = loanRepository.countByStatusAndDueDateBefore(LoanStatus.ACTIVE, today);
        long returnedLoans = loanRepository.countByStatus(LoanStatus.RETURNED);

        CirculationReportItem circulation = new CirculationReportItem(
                totalLoans, activeLoans, overdueLoansCount, returnedLoans
        );

        // 3. Overdue Loans
        List<Loan> overdueEntities = loanRepository.findOverdueLoans(LoanStatus.ACTIVE, today);
        List<OverdueLoanItem> overdueLoans = new ArrayList<>();
        for (Loan l : overdueEntities) {
            UserAccount borrower = l.getBorrower();
            String borrowerName = borrower.getInstitutionalId() != null
                    ? borrower.getInstitutionalId()
                    : borrower.getEmail().split("@")[0];
            long daysOverdue = ChronoUnit.DAYS.between(l.getDueDate(), today);

            overdueLoans.add(new OverdueLoanItem(
                    l.getId(),
                    l.getCopy().getBook().getTitle(),
                    l.getCopy().getBook().getIsbn(),
                    l.getCopy().getCopyIdentifier(),
                    borrowerName,
                    borrower.getEmail(),
                    borrower.getInstitutionalId(),
                    l.getIssueDate(),
                    l.getDueDate(),
                    Math.max(1, daysOverdue)
            ));
        }

        // 4. Top Borrowed Books
        List<TopBorrowedBookProjection> topBooksData = loanRepository.findTopBorrowedBooks(PageRequest.of(0, 10));
        List<TopBorrowedBookItem> topBooks = new ArrayList<>();
        if (!topBooksData.isEmpty()) {
            List<UUID> bookIds = topBooksData.stream().map(TopBorrowedBookProjection::getBookId).toList();
            Map<UUID, Book> bookMap = bookRepository.findAllById(bookIds).stream()
                    .collect(Collectors.toMap(Book::getId, b -> b));

            for (TopBorrowedBookProjection row : topBooksData) {
                Book book = bookMap.get(row.getBookId());
                String authors = (book != null && book.getAuthors() != null)
                        ? book.getAuthors().stream()
                                .map(Author::getName)
                                .sorted(String.CASE_INSENSITIVE_ORDER)
                                .collect(Collectors.joining(", "))
                        : "";
                topBooks.add(new TopBorrowedBookItem(
                        row.getBookId(),
                        row.getTitle(),
                        authors,
                        row.getIsbn(),
                        row.getLoanCount()
                ));
            }
        }

        return new ReportSummaryResponse(inventory, circulation, overdueLoans, topBooks);
    }
}
