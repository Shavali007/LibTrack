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

    @Column(name = "identity_verified_at")
    private Instant identityVerifiedAt;

    @Column(name = "created_by_account_id")
    private UUID createdByAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provisioning_source", nullable = false, length = 24)
    private ProvisioningSource provisioningSource;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAccount() {}

    public static UserAccount provisionMember(String email, String passwordHash, AccountRole role,
                                              String institutionalId, UUID librarianId, Instant verifiedAt) {
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = role;
        account.institutionalId = institutionalId;
        account.createdByAccountId = librarianId;
        account.identityVerifiedAt = verifiedAt;
        account.provisioningSource = ProvisioningSource.LIBRARIAN;
        account.enabled = true;
        return account;
    }

    public static UserAccount pendingSelfRegistration(String email, String passwordHash, AccountRole role) {
        if (role != AccountRole.STUDENT && role != AccountRole.FACULTY) throw new IllegalArgumentException("Only Student and Faculty accounts may self-register.");
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = role;
        account.provisioningSource = ProvisioningSource.SELF_REGISTRATION;
        account.enabled = false;
        return account;
    }
    public static UserAccount initialLibrarian(String email, String passwordHash) {
        UserAccount account = new UserAccount();
        account.email = email;
        account.passwordHash = passwordHash;
        account.role = AccountRole.LIBRARIAN;
        account.provisioningSource = ProvisioningSource.BOOTSTRAP;
        account.enabled = true;
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
    public void activateAfterEmailVerification() {
        if (enabled || provisioningSource != ProvisioningSource.SELF_REGISTRATION
                || (role != AccountRole.STUDENT && role != AccountRole.FACULTY)) {
            throw new IllegalStateException("Only a pending Student or Faculty self-registration can be verified.");
        }
        enabled = true;
    }
    public void deactivate() { enabled = false; }
    public String getInstitutionalId() { return institutionalId; }
    public Instant getIdentityVerifiedAt() { return identityVerifiedAt; }
    public UUID getCreatedByAccountId() { return createdByAccountId; }
    public ProvisioningSource getProvisioningSource() { return provisioningSource; }
}

