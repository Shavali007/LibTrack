package com.libtrack.notifications;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_notification")
public class AppNotification {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_account_id")
    private UserAccount recipient;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", length = 20)
    private AccountRole targetRole;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Column(name = "full_message", columnDefinition = "TEXT")
    private String fullMessage;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Column(name = "action_route", length = 255)
    private String actionRoute;

    @Column(name = "dedup_key", length = 150)
    private String dedupKey;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AppNotification() {}

    public AppNotification(UUID id, UserAccount recipient, AccountRole targetRole,
                           String title, String message, String category,
                           boolean isRead, Instant createdAt) {
        this(id, recipient, targetRole, title, message, null, category, null, null, null, null, isRead, null, createdAt);
    }

    public AppNotification(UUID id, UserAccount recipient, AccountRole targetRole,
                           String title, String message, String fullMessage,
                           String category, String relatedEntityType, UUID relatedEntityId,
                           String actionRoute, String dedupKey,
                           boolean isRead, Instant readAt, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.recipient = recipient;
        this.targetRole = targetRole;
        this.title = Objects.requireNonNull(title, "title must not be null");
        this.message = Objects.requireNonNull(message, "message must not be null");
        this.fullMessage = fullMessage;
        this.category = Objects.requireNonNull(category, "category must not be null");
        this.relatedEntityType = relatedEntityType;
        this.relatedEntityId = relatedEntityId;
        this.actionRoute = actionRoute;
        this.dedupKey = dedupKey;
        this.isRead = isRead;
        this.readAt = readAt;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public UUID getId() { return id; }
    public UserAccount getRecipient() { return recipient; }
    public AccountRole getTargetRole() { return targetRole; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getFullMessage() { return fullMessage; }
    public String getCategory() { return category; }
    public String getRelatedEntityType() { return relatedEntityType; }
    public UUID getRelatedEntityId() { return relatedEntityId; }
    public String getActionRoute() { return actionRoute; }
    public String getDedupKey() { return dedupKey; }
    public boolean isRead() { return isRead; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void markRead(Instant at) {
        this.isRead = true;
        this.readAt = at != null ? at : Instant.now();
    }

    public void markRead() {
        markRead(Instant.now());
    }

    public void markUnread() {
        this.isRead = false;
        this.readAt = null;
    }
}
