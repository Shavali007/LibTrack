package com.libtrack.fines;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.libtrack.auth.UserAccount;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "fine_payment", indexes = {
        @Index(name = "ix_fine_payment_fine", columnList = "fine_id")
})
public class FinePayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fine_id", nullable = false, updatable = false)
    private Fine fine;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_date", nullable = false, updatable = false)
    private Instant paymentDate;

    @Column(name = "receipt_number", nullable = false, length = 100)
    private String receiptNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by_account_id", nullable = false, updatable = false)
    private UserAccount recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected FinePayment() {}

    public FinePayment(Fine fine, BigDecimal amount, Instant paymentDate, String receiptNumber, UserAccount recordedBy) {
        this.fine = fine;
        this.amount = amount;
        this.paymentDate = paymentDate;
        this.receiptNumber = receiptNumber;
        this.recordedBy = recordedBy;
        this.createdAt = paymentDate;
    }

    public UUID getId() { return id; }
    public Fine getFine() { return fine; }
    public BigDecimal getAmount() { return amount; }
    public Instant getPaymentDate() { return paymentDate; }
    public String getReceiptNumber() { return receiptNumber; }
    public UserAccount getRecordedBy() { return recordedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
