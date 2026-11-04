package com.libtrack.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "user_account", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_account_email", columnNames = "email"),
    @UniqueConstraint(name = "uq_user_account_institutional_id", columnNames = "institutional_id")
})
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountRole role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "institutional_id", length = 100)
    private String institutionalId;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "identity_verified_at")
    private Instant identityVerifiedAt;

    @Column(name = "created_by_account_id")
    private UUID createdByAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provisioning_source", nullable = false, length = 24)
    private ProvisioningSource provisioningSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 25)
    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "librarian_remarks", columnDefinition = "TEXT")
    private String librarianRemarks;

    @Column(name = "reviewed_by_account_id")
    private UUID reviewedByAccountId;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAccount() {}

    public static UserAccount provisionMember(String email, String passwordHash, AccountRole role,
                                              String institutionalId, UUID librarianId, Instant verifiedAt) {
        return provisionMember(email, passwordHash, role, institutionalId, librarianId, verifiedAt, null);
    }

    public static UserAccount provisionMember(String email, String passwordHash, AccountRole role,
                                              String institutionalId, UUID librarianId, Instant verifiedAt, String displayName) {
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = role;
        account.institutionalId = institutionalId;
        account.createdByAccountId = librarianId;
        account.identityVerifiedAt = verifiedAt;
        account.provisioningSource = ProvisioningSource.LIBRARIAN;
        account.enabled = true;
        account.displayName = displayName;
        return account;
    }

    public static UserAccount pendingSelfRegistration(String email, String passwordHash, AccountRole role) {
        return pendingSelfRegistration(email, passwordHash, role, null, null);
    }

    public static UserAccount pendingSelfRegistration(String email, String passwordHash, AccountRole role, String displayName) {
        return pendingSelfRegistration(email, passwordHash, role, displayName, null);
    }

    public static UserAccount pendingSelfRegistration(String email, String passwordHash, AccountRole role, String displayName, String institutionalId) {
        if (role != AccountRole.STUDENT && role != AccountRole.FACULTY) throw new IllegalArgumentException("Only Student and Faculty accounts may self-register.");
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = role;
        account.provisioningSource = ProvisioningSource.SELF_REGISTRATION;
        account.enabled = false;
        account.displayName = displayName;
        account.institutionalId = institutionalId;
        account.approvalStatus = ApprovalStatus.PENDING_APPROVAL;
        return account;
    }
    public static UserAccount initialLibrarian(String email, String passwordHash) {
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = AccountRole.LIBRARIAN;
        account.provisioningSource = ProvisioningSource.BOOTSTRAP;
        account.enabled = true;
        account.displayName = "Librarian";
        return account;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public AccountRole getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public void updatePassword(String newPasswordHash) {
        if (newPasswordHash == null || newPasswordHash.isBlank()) {
            throw new IllegalArgumentException("Password hash must not be empty.");
        }
        this.passwordHash = newPasswordHash;
    }
    public void approve(UUID librarianId, String remarks, Instant timestamp) {
        if (this.approvalStatus != ApprovalStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending requests can be approved.");
        }
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.enabled = true;
        this.identityVerifiedAt = timestamp;
        this.reviewedByAccountId = librarianId;
        this.reviewedAt = timestamp;
        this.librarianRemarks = remarks;
        this.rejectionReason = null;
    }

    public void reject(UUID librarianId, String reason, String remarks, Instant timestamp) {
        if (this.approvalStatus != ApprovalStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending requests can be rejected.");
        }
        this.approvalStatus = ApprovalStatus.REJECTED;
        this.enabled = false;
        this.reviewedByAccountId = librarianId;
        this.reviewedAt = timestamp;
        this.rejectionReason = reason;
        this.librarianRemarks = remarks;
    }

    public void deactivate() { enabled = false; }
    public void enable() {
        if (approvalStatus != ApprovalStatus.APPROVED) {
            throw new IllegalStateException("Only an approved account can be enabled.");
        }
        enabled = true;
    }
    public String getInstitutionalId() { return institutionalId; }
    public Instant getIdentityVerifiedAt() { return identityVerifiedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public UUID getCreatedByAccountId() { return createdByAccountId; }
    public ProvisioningSource getProvisioningSource() { return provisioningSource; }
    public ApprovalStatus getApprovalStatus() { return approvalStatus; }
    public String getRejectionReason() { return rejectionReason; }
    public String getLibrarianRemarks() { return librarianRemarks; }
    public UUID getReviewedByAccountId() { return reviewedByAccountId; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}

