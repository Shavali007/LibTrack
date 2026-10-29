package com.libtrack.fines;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.UserAccount;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;
import com.libtrack.reports.OverdueLoanItem;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/librarian/fines")
@PreAuthorize("hasRole('LIBRARIAN')")
public class FinesController {
    private final FineService fineService;
    private final LoanRepository loanRepository;
    private final Clock clock;

    public FinesController(FineService fineService, LoanRepository loanRepository, Clock clock) {
        this.fineService = fineService;
        this.loanRepository = loanRepository;
        this.clock = clock;
    }

    @GetMapping
    public ResponseEntity<List<FineRecordResponse>> getAllFines() {
        return ResponseEntity.ok(fineService.getAllFines());
    }

    @GetMapping("/summary")
    public ResponseEntity<FineSummaryResponse> getSummary() {
        return ResponseEntity.ok(fineService.getSummary());
    }

    @PostMapping("/{fineId}/payments")
    public ResponseEntity<FineRecordResponse> recordPayment(
            @PathVariable UUID fineId,
            @Valid @RequestBody RecordPaymentRequest request,
            Authentication auth) {
        UUID librarianId = ((AccountUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(fineService.recordPayment(fineId, request, librarianId));
    }

    @GetMapping("/policy")
    public ResponseEntity<FinesPolicyResponse> getPolicy() {
        LocalDate today = LocalDate.now(clock);
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

        FinesPolicyResponse response = new FinesPolicyResponse(
                "UNCONFIGURED",
                "Institutional Monetary Fines Policy",
                "Automated financial penalties and payment gateway integrations are currently unconfigured by university policy. Overdue items are audited administratively to preserve compliance without creating unauthorized ledger balances.",
                false,
                overdueLoans.size(),
                overdueLoans
        );

        return ResponseEntity.ok(response);
    }
}
