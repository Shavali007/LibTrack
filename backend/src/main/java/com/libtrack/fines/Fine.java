package com.libtrack.fines;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.libtrack.auth.UserAccount;
import com.libtrack.circulation.Loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "fine", indexes = {
        @Index(name = "ix_fine_borrower_status", columnList = "borrower_account_id, status"),
        @Index(name = "ix_fine_status", columnList = "status")
})
public class Fine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false, unique = true, updatable = false)
    private Loan loan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "borrower_account_id", nullable = false, updatable = false)
    private UserAccount borrower;

    @Column(name = "daily_fine_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyFineRate;

    @Column(name = "max_fine_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxFineAmount;

    @Column(name = "overdue_days", nullable = false)
    private int overdueDays;

    @Column(name = "fine_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal fineAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FineStatus status = FineStatus.UNPAID;

    @Column(name = "assessed_at", nullable = false, updatable = false)
    private Instant assessedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected Fine() {}

    public Fine(Loan loan, UserAccount borrower, BigDecimal dailyFineRate, BigDecimal maxFineAmount,
                int overdueDays, BigDecimal fineAmount, Instant assessedAt) {
        this.loan = loan;
        this.borrower = borrower;
        this.dailyFineRate = dailyFineRate;
        this.maxFineAmount = maxFineAmount;
        this.overdueDays = overdueDays;
        this.fineAmount = fineAmount;
        this.status = FineStatus.UNPAID;
        this.assessedAt = assessedAt;
        this.updatedAt = assessedAt;
    }

    public void updateOverdue(int overdueDays, BigDecimal fineAmount, Instant updatedAt) {
        if (this.status == FineStatus.PAID) {
            return;
        }
        this.overdueDays = overdueDays;
        this.fineAmount = fineAmount;
        this.updatedAt = updatedAt;
    }

    public void markPaid(Instant paidAt) {
        this.status = FineStatus.PAID;
        this.paidAt = paidAt;
        this.updatedAt = paidAt;
    }

    public UUID getId() { return id; }
    public Loan getLoan() { return loan; }
    public UserAccount getBorrower() { return borrower; }
    public BigDecimal getDailyFineRate() { return dailyFineRate; }
    public BigDecimal getMaxFineAmount() { return maxFineAmount; }
    public int getOverdueDays() { return overdueDays; }
    public BigDecimal getFineAmount() { return fineAmount; }
    public FineStatus getStatus() { return status; }
    public Instant getAssessedAt() { return assessedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPaidAt() { return paidAt; }
}
