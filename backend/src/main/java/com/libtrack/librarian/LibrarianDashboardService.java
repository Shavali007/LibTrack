package com.libtrack.librarian;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;

@Service
public class LibrarianDashboardService {
    private final BookRepository books;
    private final BookCopyRepository copies;
    private final BorrowRequestRepository requests;
    private final LoanRepository loans;
    private final UserAccountRepository accounts;
    private final Clock clock;

    public LibrarianDashboardService(BookRepository books,
                                     BookCopyRepository copies,
                                     BorrowRequestRepository requests,
                                     LoanRepository loans,
                                     UserAccountRepository accounts,
                                     Clock clock) {
        this.books = books;
        this.copies = copies;
        this.requests = requests;
        this.loans = loans;
        this.accounts = accounts;
        this.clock = clock;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        long totalBooks = books.count();
        long bookCopies = copies.count();
        long activeMembers = accounts.countActiveMembers();
        long pendingRequests = requests.countByStatus(BorrowRequestStatus.PENDING);
        return new DashboardStatsResponse(totalBooks, bookCopies, activeMembers, pendingRequests);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<MonthlyCirculationOverview> getCirculationOverview(int monthsCount) {
        if (monthsCount <= 0 || monthsCount > 12) {
            monthsCount = 5;
        }

        LocalDate today = LocalDate.now(clock);
        YearMonth current = YearMonth.from(today);
        List<MonthlyCirculationOverview> list = new ArrayList<>();

        for (int i = monthsCount - 1; i >= 0; i--) {
            YearMonth targetMonth = current.minusMonths(i);
            LocalDate start = targetMonth.atDay(1);
            LocalDate end = targetMonth.atEndOfMonth();

            long issued = loans.countByIssueDateBetween(start, end);
            long returned = loans.countByActualReturnDateBetween(start, end);

            String monthName = targetMonth.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            list.add(new MonthlyCirculationOverview(monthName, targetMonth.getYear(), issued, returned));
        }

        return list;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<RecentActivityItem> getRecentActivity(int limit) {
        if (limit <= 0 || limit > 50) {
            limit = 5;
        }

        PageRequest pageRequest = PageRequest.of(0, limit);
        List<Loan> recentLoans = loans.findRecentLoans(pageRequest);
        List<BorrowRequest> recentDecisions = requests.findRecentDecisions(pageRequest);

        List<RecentActivityItem> activities = new ArrayList<>();

        for (Loan l : recentLoans) {
            String memberId = l.getBorrower().getInstitutionalId();
            if (memberId == null || memberId.isBlank()) {
                memberId = l.getBorrower().getEmail().split("@")[0];
            }
            if (l.getStatus() == LoanStatus.RETURNED && l.getActualReturnDate() != null) {
                activities.add(new RecentActivityItem(
                    "return-" + l.getId(),
                    "RETURNED",
                    l.getCopy().getBook().getTitle(),
                    memberId,
                    l.getBorrower().getEmail(),
                    l.getActualReturnDate().atStartOfDay(ZoneOffset.UTC).toInstant(),
                    "Returned copy " + l.getCopy().getCopyIdentifier()
                ));
            }
            activities.add(new RecentActivityItem(
                "loan-" + l.getId(),
                "ISSUED",
                l.getCopy().getBook().getTitle(),
                memberId,
                l.getBorrower().getEmail(),
                l.getCreatedAt(),
                "Issued until " + l.getDueDate()
            ));
        }

        for (BorrowRequest r : recentDecisions) {
            String memberId = r.getBorrower().getInstitutionalId();
            if (memberId == null || memberId.isBlank()) {
                memberId = r.getBorrower().getEmail().split("@")[0];
            }
            String action = r.getStatus() == BorrowRequestStatus.APPROVED ? "APPROVED" : "REJECTED";
            String details = r.getStatus() == BorrowRequestStatus.APPROVED
                ? "Borrow request approved"
                : (r.getDecisionReason() != null ? "Request rejected: " + r.getDecisionReason() : "Borrow request rejected");

            activities.add(new RecentActivityItem(
                "request-" + r.getId(),
                action,
                r.getBook().getTitle(),
                memberId,
                r.getBorrower().getEmail(),
                r.getDecidedAt(),
                details
            ));
        }

        activities.sort((a, b) -> b.timestamp().compareTo(a.timestamp()));

        if (activities.size() > limit) {
            return activities.subList(0, limit);
        }
        return activities;
    }
}
