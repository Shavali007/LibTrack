package com.libtrack.feedback;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import com.libtrack.auth.UserAccount;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_feedback")
public class Feedback {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private UserAccount account;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "subject", nullable = false, length = 200)
    private String subject;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Feedback() {}

    public Feedback(UUID id, UserAccount account, String category, String subject, String message, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.account = Objects.requireNonNull(account, "account must not be null");
        this.category = Objects.requireNonNull(category, "category must not be null");
        this.subject = Objects.requireNonNull(subject, "subject must not be null");
        this.message = Objects.requireNonNull(message, "message must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public UUID getId() { return id; }
    public UserAccount getAccount() { return account; }
    public String getCategory() { return category; }
    public String getSubject() { return subject; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
}
