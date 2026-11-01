package com.libtrack.librarian;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_approval_audit")
public class MemberApprovalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "decision", nullable = false, length = 25)
    private String decision;

    @Column(name = "reviewed_by_account_id")
    private UUID reviewedByAccountId;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MemberApprovalAudit() {}

    public MemberApprovalAudit(UUID accountId, String decision, UUID reviewedByAccountId, Instant reviewedAt, String rejectionReason, String remarks) {
        this.accountId = accountId;
        this.decision = decision;
        this.reviewedByAccountId = reviewedByAccountId;
        this.reviewedAt = reviewedAt;
        this.rejectionReason = rejectionReason;
        this.remarks = remarks;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getAccountId() { return accountId; }
    public String getDecision() { return decision; }
    public UUID getReviewedByAccountId() { return reviewedByAccountId; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public String getRemarks() { return remarks; }
    public Instant getCreatedAt() { return createdAt; }
}
