package com.libtrack.fines;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.notifications.NotificationService;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.circulation.CirculationConflictException;
import com.libtrack.circulation.CirculationNotFoundException;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanEvent;
import com.libtrack.circulation.LoanEventRepository;
import com.libtrack.circulation.LoanEventType;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;

@Service
public class FineService {
    private final FineRepository fineRepository;
    private final FinePaymentRepository finePaymentRepository;
    private final LoanRepository loanRepository;
    private final LoanEventRepository loanEventRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public FineService(FineRepository fineRepository,
                       FinePaymentRepository finePaymentRepository,
                       LoanRepository loanRepository,
                       LoanEventRepository loanEventRepository,
                       UserAccountRepository userAccountRepository,
                       NotificationService notificationService,
                       Clock clock) {
        this.fineRepository = fineRepository;
        this.finePaymentRepository = finePaymentRepository;
        this.loanRepository = loanRepository;
        this.loanEventRepository = loanEventRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    @Transactional
    public void recalculateOverdueFines() {
        LocalDate today = LocalDate.now(clock);
        Instant now = Instant.now(clock);
        List<Loan> overdueLoans = loanRepository.findOverdueLoans(LoanStatus.ACTIVE, today);

        for (Loan loan : overdueLoans) {
            if (loan.getDailyFineRate().signum() == 0 || loan.getMaxFineAmount().signum() == 0) {
                continue;
            }
            long daysOverdue = ChronoUnit.DAYS.between(loan.getDueDate(), today);
            if (daysOverdue > loan.getGracePeriodDays()) {
                long effectiveDays = daysOverdue - loan.getGracePeriodDays();
                BigDecimal dailyRate = loan.getDailyFineRate();
                BigDecimal maxFine = loan.getMaxFineAmount();
                BigDecimal calculatedFine = dailyRate.multiply(BigDecimal.valueOf(effectiveDays)).min(maxFine);

                fineRepository.findByLoan_Id(loan.getId()).ifPresentOrElse(
                        existing -> {
                            if (existing.getStatus() == FineStatus.UNPAID) {
                                existing.updateOverdue((int) daysOverdue, calculatedFine, now);
                                fineRepository.save(existing);
                            }
                        },
                        () -> {
                            Fine newFine = new Fine(
                                    loan,
                                    loan.getBorrower(),
                                    dailyRate,
                                    maxFine,
                                    (int) daysOverdue,
                                    calculatedFine,
                                    now
                            );
                            Fine saved = fineRepository.save(newFine);
                            String dedupKey = "FINE_ASSESSED:" + loan.getId() + ":" + loan.getDueDate();
                            notificationService.sendMemberNotification(
                                    loan.getBorrower().getId(),
                                    "Fine Generated",
                                    "A fine of ₹" + calculatedFine + " was assessed for overdue loan.",
                                    "Book: \"" + loan.getCopy().getBook().getTitle() + "\"",
                                    "FINE",
                                    "FINE",
                                    saved.getId(),
                                    "/workspace/my/fines",
                                    dedupKey
                            );
                        }
                );
            }
        }
    }

    @Transactional
    public void finalizeFineOnReturn(Loan loan) {
        LocalDate returnDate = loan.getActualReturnDate();
        if (returnDate != null && returnDate.isAfter(loan.getDueDate())) {
            if (loan.getDailyFineRate().signum() == 0 || loan.getMaxFineAmount().signum() == 0) {
                return;
            }
            Instant now = Instant.now(clock);
            long daysOverdue = ChronoUnit.DAYS.between(loan.getDueDate(), returnDate);
            if (daysOverdue > loan.getGracePeriodDays()) {
                long effectiveDays = daysOverdue - loan.getGracePeriodDays();
                BigDecimal dailyRate = loan.getDailyFineRate();
                BigDecimal maxFine = loan.getMaxFineAmount();
                BigDecimal finalAmount = dailyRate.multiply(BigDecimal.valueOf(effectiveDays)).min(maxFine);

                fineRepository.findByLoan_Id(loan.getId()).ifPresentOrElse(
                        existing -> {
                            if (existing.getStatus() == FineStatus.UNPAID) {
                                existing.updateOverdue((int) daysOverdue, finalAmount, now);
                                fineRepository.save(existing);
                            }
                        },
                        () -> {
                            Fine fine = new Fine(
                                    loan,
                                    loan.getBorrower(),
                                    dailyRate,
                                    maxFine,
                                    (int) daysOverdue,
                                    finalAmount,
                                    now
                            );
                            fineRepository.save(fine);
                        }
                );
            }
        }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public FineSummaryResponse getSummary() {
        recalculateOverdueFines();
        long totalFines = fineRepository.count();
        long unpaidFines = fineRepository.countByStatus(FineStatus.UNPAID);
        long paidFines = fineRepository.countByStatus(FineStatus.PAID);
        BigDecimal totalCollected = finePaymentRepository.sumTotalCollected();
        BigDecimal totalOutstanding = fineRepository.sumUnpaidFines();
        LocalDate today = LocalDate.now(clock);
        long currentlyOverdueLoans = loanRepository.countByStatusAndDueDateBefore(LoanStatus.ACTIVE, today);

        return new FineSummaryResponse(
                totalFines,
                unpaidFines,
                paidFines,
                totalCollected != null ? totalCollected : BigDecimal.ZERO,
                totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO,
                currentlyOverdueLoans
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public List<FineRecordResponse> getAllFines() {
        recalculateOverdueFines();
        List<Fine> fines = fineRepository.findAllWithDetails();
        return fines.stream().map(this::toResponse).toList();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public FineRecordResponse getFine(UUID fineId) {
        recalculateOverdueFines();
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(CirculationNotFoundException::new);
        return toResponse(fine);
    }

    @PreAuthorize("hasAnyRole('STUDENT','FACULTY')")
    @Transactional
    public List<FineRecordResponse> getMemberFines(UUID memberId) {
        recalculateOverdueFines();
        List<Fine> fines = fineRepository.findByBorrowerIdWithDetails(memberId);
        return fines.stream().map(this::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('STUDENT','FACULTY')")
    @Transactional
    public MemberFineSummaryResponse getMemberSummary(UUID memberId) {
        recalculateOverdueFines();
        BigDecimal totalOutstanding = fineRepository.sumUnpaidFinesByBorrower(memberId);
        BigDecimal totalPaid = fineRepository.sumPaidFinesByBorrower(memberId);
        long unpaidCount = fineRepository.countByBorrower_IdAndStatus(memberId, FineStatus.UNPAID);
        long paidCount = fineRepository.countByBorrower_IdAndStatus(memberId, FineStatus.PAID);
        long totalAssessments = fineRepository.countByBorrower_Id(memberId);
        LocalDate today = LocalDate.now(clock);
        long currentOverdueCount = loanRepository.countOverdueLoansByBorrower(memberId, today);

        return new MemberFineSummaryResponse(
                totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO,
                unpaidCount,
                totalPaid != null ? totalPaid : BigDecimal.ZERO,
                paidCount,
                totalAssessments,
                currentOverdueCount
        );
    }

    @PreAuthorize("hasAnyRole('STUDENT','FACULTY')")
    @Transactional
    public FineRecordResponse getMemberFine(UUID fineId, UUID memberId) {
        recalculateOverdueFines();
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(CirculationNotFoundException::new);
        if (!fine.getBorrower().getId().equals(memberId)) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to view this fine.");
        }
        return toResponse(fine);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public FineRecordResponse recordPayment(UUID fineId, RecordPaymentRequest request, UUID librarianId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(CirculationNotFoundException::new);

        if (fine.getStatus() == FineStatus.PAID) {
            throw new CirculationConflictException("This fine has already been paid in full.");
        }

        if (request.amount().compareTo(fine.getFineAmount()) != 0) {
            throw new CirculationConflictException("Partial payments are prohibited. The full fine amount of ₹"
                    + fine.getFineAmount() + " must be settled.");
        }

        UserAccount librarian = userAccountRepository.findById(librarianId)
                .orElseThrow(() -> new CirculationConflictException("Librarian account not found."));

        Instant now = Instant.now(clock);
        fine.markPaid(now);
        fine = fineRepository.save(fine);

        FinePayment payment = new FinePayment(
                fine,
                request.amount(),
                now,
                request.receiptNumber().trim(),
                librarian
        );
        finePaymentRepository.save(payment);

        notificationService.sendMemberNotification(
                fine.getBorrower().getId(),
                "Fine Payment Recorded",
                "Payment of ₹" + request.amount() + " recorded for \"" + fine.getLoan().getCopy().getBook().getTitle() + "\".",
                "Receipt number: " + request.receiptNumber(),
                "FINE",
                "FINE",
                fine.getId(),
                "/workspace/my/fines",
                null
        );

        return toResponse(fine);
    }

    private FineRecordResponse toResponse(Fine fine) {
        Loan loan = fine.getLoan();
        BookCopy copy = loan.getCopy();
        Book book = copy.getBook();
        UserAccount borrower = fine.getBorrower();

        String borrowerName = borrower.getDisplayName() != null && !borrower.getDisplayName().isBlank()
                ? borrower.getDisplayName()
                : (borrower.getInstitutionalId() != null
                    ? borrower.getInstitutionalId()
                    : borrower.getEmail().split("@")[0]);

        List<FinePayment> payments = finePaymentRepository.findByFineIdWithDetails(fine.getId());
        List<FinePaymentResponse> paymentResponses = payments.stream()
                .map(p -> new FinePaymentResponse(
                        p.getId(),
                        p.getAmount(),
                        p.getPaymentDate(),
                        p.getReceiptNumber(),
                        p.getRecordedBy() != null ? p.getRecordedBy().getEmail() : "librarian"
                ))
                .toList();

        LocalDate today = LocalDate.now(clock);
        boolean loanOverdue = loan.getStatus() == LoanStatus.ACTIVE && loan.getDueDate().isBefore(today);
        boolean renewed = loan.getRenewalCount() > 0;
        LocalDate originalDueDate = loan.getDueDate();
        if (renewed) {
            List<LoanEvent> events = loanEventRepository.history(loan.getId());
            for (LoanEvent e : events) {
                if (e.getEventType() == LoanEventType.RENEWED && e.getPreviousDueDate() != null) {
                    originalDueDate = e.getPreviousDueDate();
                    break;
                }
            }
        }

        String borrowerRole = borrower.getRole() != null ? borrower.getRole().name() : "STUDENT";

        return new FineRecordResponse(
                fine.getId(),
                loan.getId(),
                borrower.getId(),
                borrowerName,
                borrower.getEmail(),
                borrower.getInstitutionalId(),
                borrowerRole,
                book.getId(),
                book.getTitle(),
                book.getIsbn(),
                book.getCoverImageUrl(),
                copy.getCopyIdentifier(),
                loan.getIssueDate(),
                loan.getDueDate(),
                loan.getActualReturnDate(),
                loan.getStatus().name(),
                fine.getDailyFineRate(),
                fine.getMaxFineAmount(),
                loan.getGracePeriodDays(),
                fine.getOverdueDays(),
                fine.getFineAmount(),
                fine.getStatus(),
                fine.getAssessedAt(),
                fine.getPaidAt(),
                paymentResponses,
                loanOverdue,
                renewed,
                originalDueDate
        );
    }
}
