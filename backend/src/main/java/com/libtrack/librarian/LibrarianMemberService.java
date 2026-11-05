package com.libtrack.librarian;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.AccountNotFoundException;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.catalogue.PageResponse;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestEventRepository;
import com.libtrack.circulation.BorrowRequestEventResponse;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestResponse;
import com.libtrack.circulation.BorrowerLoanCount;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanEventRepository;
import com.libtrack.circulation.LoanEventResponse;
import com.libtrack.circulation.LoanEventType;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanResponse;
import com.libtrack.circulation.LoanStatus;

import com.libtrack.circulation.AcademicSemesterService;
import com.libtrack.circulation.UserSemesterRenewalRepository;

@Service
public class LibrarianMemberService {
    private static final int MAX_PAGE_SIZE = 100;

    private final UserAccountRepository accounts;
    private final LoanRepository loans;
    private final BorrowRequestRepository requests;
    private final LoanEventRepository loanEvents;
    private final BorrowRequestEventRepository requestEvents;
    private final AcademicSemesterService semesterService;
    private final UserSemesterRenewalRepository userSemesterRenewals;
    private final Clock clock;

    public LibrarianMemberService(UserAccountRepository accounts,
                                  LoanRepository loans,
                                  BorrowRequestRepository requests,
                                  LoanEventRepository loanEvents,
                                  BorrowRequestEventRepository requestEvents,
                                  AcademicSemesterService semesterService,
                                  UserSemesterRenewalRepository userSemesterRenewals,
                                  Clock clock) {
        this.accounts = accounts;
        this.loans = loans;
        this.requests = requests;
        this.loanEvents = loanEvents;
        this.requestEvents = requestEvents;
        this.semesterService = semesterService;
        this.userSemesterRenewals = userSemesterRenewals;
        this.clock = clock;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public PageResponse<MemberSummaryResponse> listMembers(String q, AccountRole role, Boolean enabled, int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must be zero or greater.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and 100.");
        }

        Page<UserAccount> result = accounts.findAll(
            MemberSpecifications.members(q, role, enabled),
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<UUID> memberIds = result.getContent().stream().map(UserAccount::getId).toList();
        Map<UUID, Long> loanCounts = new HashMap<>();
        if (!memberIds.isEmpty()) {
            for (BorrowerLoanCount count : loans.countActiveLoansByBorrowerIds(memberIds)) {
                loanCounts.put(count.getBorrowerId(), count.getActiveCount());
            }
        }

        List<MemberSummaryResponse> content = result.getContent().stream().map(account ->
            new MemberSummaryResponse(
                account.getId(),
                account.getEmail(),
                account.getRole(),
                account.isEnabled(),
                account.getInstitutionalId(),
                account.getCreatedAt(),
                loanCounts.getOrDefault(account.getId(), 0L),
                account.getDisplayName()
            )
        ).toList();

        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public MemberDetailResponse getMemberDetails(UUID memberId) {
        UserAccount account = accounts.findById(memberId).orElseThrow(AccountNotFoundException::new);
        if (account.getRole() == AccountRole.LIBRARIAN) {
            throw new IllegalArgumentException("Librarian accounts are administrative and cannot be viewed in the member directory.");
        }

        LocalDate today = LocalDate.now(clock);
        List<Loan> activeLoanEntities = loans.findByBorrower_IdAndStatusOrderByDueDateAsc(memberId, LoanStatus.ACTIVE);
        List<Loan> pastLoanEntities = loans.findByBorrower_IdAndStatusNotOrderByIssueDateDesc(memberId, LoanStatus.ACTIVE);
        List<BorrowRequest> requestEntities = requests.findByBorrower_IdOrderBySubmittedAtDesc(memberId);

        List<LoanResponse> currentLoans = activeLoanEntities.stream().map(l -> toLoanResponse(l, today)).toList();
        List<LoanResponse> pastLoans = pastLoanEntities.stream().map(l -> toLoanResponse(l, today)).toList();
        List<BorrowRequestResponse> borrowRequests = requestEntities.stream().map(this::toRequestResponse).toList();

        return new MemberDetailResponse(
            account.getId(),
            account.getEmail(),
            account.getRole(),
            account.isEnabled(),
            account.getInstitutionalId(),
            account.getCreatedAt(),
            account.getIdentityVerifiedAt(),
            currentLoans,
            pastLoans,
            borrowRequests,
            account.getDisplayName()
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public void updateAccountStatus(UUID memberId, boolean enabled) {
        UserAccount account = accounts.findById(memberId).orElseThrow(AccountNotFoundException::new);
        if (account.getRole() == AccountRole.LIBRARIAN) {
            throw new IllegalArgumentException("Librarian account status cannot be altered through member management.");
        }

        if (enabled) {
            account.enable();
        } else {
            account.deactivate();
        }
        accounts.flush();
    }

    private LoanResponse toLoanResponse(Loan loan, LocalDate today) {
        Book book = loan.getCopy().getBook();
        boolean overdue = loan.getStatus() == LoanStatus.ACTIVE && loan.getDueDate().isBefore(today);
        String semesterCode = semesterService.getCurrentSemester().getSemesterCode();
        boolean renewalEligible = loan.getStatus() == LoanStatus.ACTIVE
                && loan.getRenewalCount() < 1
                && loan.getCopy().getStatus() == CopyStatus.ON_LOAN
                && loan.getCopy().getBook().getCirculationPolicy() == CirculationPolicy.STANDARD
                && !loan.getDueDate().isBefore(today)
                && !userSemesterRenewals.existsByUser_IdAndSemesterCode(loan.getBorrower().getId(), semesterCode);

        List<LoanEventResponse> history = loanEvents.history(loan.getId()).stream()
            .map(e -> new LoanEventResponse(
                e.getEventType(),
                e.getActor().getEmail(),
                e.getOccurredAt(),
                (e.getEventType() == LoanEventType.ISSUED && e.getOccurredAt() != null)
                    ? LocalDate.ofInstant(e.getOccurredAt(), clock.getZone())
                    : e.getEffectiveDate(),
                e.getPreviousDueDate(),
                e.getNewDueDate(),
                e.getCopyStatus(),
                e.getNote()
            )).toList();

        LocalDate effectiveIssueDate = loan.getCreatedAt() != null
            ? LocalDate.ofInstant(loan.getCreatedAt(), clock.getZone())
            : loan.getIssueDate();

        return new LoanResponse(
            loan.getId(),
            loan.getRequest().getId(),
            book.getId(),
            book.getTitle(),
            book.getCoverImageUrl(),
            loan.getCopy().getCopyIdentifier(),
            loan.getBorrower().getEmail(),
            loan.getStatus(),
            effectiveIssueDate,
            loan.getDueDate(),
            loan.getActualReturnDate(),
            loan.getRenewalCount(),
            overdue,
            renewalEligible,
            loan.getReturnNote(),
            history,
            loan.getBorrower().getDisplayName()
        );
    }

    private BorrowRequestResponse toRequestResponse(BorrowRequest request) {
        List<BorrowRequestEventResponse> history = requestEvents.history(request.getId()).stream()
            .map(e -> new BorrowRequestEventResponse(
                e.getEventType(),
                e.getActor().getEmail(),
                e.getOccurredAt(),
                e.getReason()
            )).toList();

        return new BorrowRequestResponse(
            request.getId(),
            request.getBook().getId(),
            request.getBook().getTitle(),
            request.getBook().getCoverImageUrl(),
            request.getBorrower().getEmail(),
            request.getBorrower().getInstitutionalId(),
            request.getBorrower().getRole() != null ? request.getBorrower().getRole().name() : null,
            request.getStatus(),
            request.getSubmittedAt(),
            request.getDecidedAt(),
            request.getDecisionReason(),
            history,
            request.getBorrower().getDisplayName()
        );
    }
}
