package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_receipt", uniqueConstraints = {
    @UniqueConstraint(name = "uq_loan_receipt_loan", columnNames = "loan_id"),
    @UniqueConstraint(name = "uq_loan_receipt_number", columnNames = "receipt_number")
})
public class LoanReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false, unique = true, updatable = false)
    private Loan loan;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 64, updatable = false)
    private String receiptNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issued_by_id", nullable = false, updatable = false)
    private UserAccount issuedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LoanReceipt() {}

    public LoanReceipt(Loan loan, String receiptNumber, UserAccount issuedBy, Instant createdAt) {
        this.loan = loan;
        this.receiptNumber = receiptNumber;
        this.issuedBy = issuedBy;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Loan getLoan() {
        return loan;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public UserAccount getIssuedBy() {
        return issuedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
