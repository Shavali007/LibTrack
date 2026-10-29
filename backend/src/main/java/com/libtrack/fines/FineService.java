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

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.circulation.CirculationConflictException;
import com.libtrack.circulation.CirculationNotFoundException;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;

@Service
public class FineService {
    private final FineRepository fineRepository;
    private final FinePaymentRepository finePaymentRepository;
    private final LoanRepository loanRepository;
    private final UserAccountRepository userAccountRepository;
    private final Clock clock;

    public FineService(FineRepository fineRepository,
                       FinePaymentRepository finePaymentRepository,
                       LoanRepository loanRepository,
                       UserAccountRepository userAccountRepository,
                       Clock clock) {
        this.fineRepository = fineRepository;
        this.finePaymentRepository = finePaymentRepository;
        this.loanRepository = loanRepository;
        this.userAccountRepository = userAccountRepository;
        this.clock = clock;
    }

    @Transactional
    public void recalculateOverdueFines() {
        LocalDate today = LocalDate.now(clock);
        Instant now = Instant.now(clock);
        List<Loan> overdueLoans = loanRepository.findOverdueLoans(LoanStatus.ACTIVE, today);

        for (Loan loan : overdueLoans) {
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
                            fineRepository.save(newFine);
                        }
                );
            }
        }
    }

    @Transactional
    public void finalizeFineOnReturn(Loan loan) {
        LocalDate returnDate = loan.getActualReturnDate();
        if (returnDate != null && returnDate.isAfter(loan.getDueDate())) {
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

        return new FineSummaryResponse(
                totalFines,
                unpaidFines,
                paidFines,
                totalCollected != null ? totalCollected : BigDecimal.ZERO,
                totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public List<FineRecordResponse> getAllFines() {
        recalculateOverdueFines();
        List<Fine> fines = fineRepository.findAllWithDetails();
        return fines.stream().map(this::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('STUDENT','FACULTY')")
    @Transactional
    public List<FineRecordResponse> getMemberFines(UUID memberId) {
        recalculateOverdueFines();
        List<Fine> fines = fineRepository.findByBorrowerIdWithDetails(memberId);
        return fines.stream().map(this::toResponse).toList();
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

        return toResponse(fine);
    }

    private FineRecordResponse toResponse(Fine fine) {
        Loan loan = fine.getLoan();
        BookCopy copy = loan.getCopy();
        Book book = copy.getBook();
        UserAccount borrower = fine.getBorrower();

        String borrowerName = borrower.getInstitutionalId() != null
                ? borrower.getInstitutionalId()
                : borrower.getEmail().split("@")[0];

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

        return new FineRecordResponse(
                fine.getId(),
                loan.getId(),
                borrower.getId(),
                borrowerName,
                borrower.getEmail(),
                borrower.getInstitutionalId(),
                book.getId(),
                book.getTitle(),
                book.getIsbn(),
                copy.getCopyIdentifier(),
                loan.getIssueDate(),
                loan.getDueDate(),
                loan.getActualReturnDate(),
                loan.getStatus().name(),
                fine.getDailyFineRate(),
                fine.getMaxFineAmount(),
                fine.getOverdueDays(),
                fine.getFineAmount(),
                fine.getStatus(),
                fine.getAssessedAt(),
                fine.getPaidAt(),
                paymentResponses
        );
    }
}
