package com.libtrack.review;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Book;
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
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "digital_edition_access",
        indexes = {
                @Index(name = "idx_digital_access_user_book", columnList = "user_account_id, book_id"),
                @Index(name = "idx_digital_access_book", columnList = "book_id")
        }
)
public class DigitalEditionAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false, updatable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_account_id", nullable = false, updatable = false)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_type", nullable = false, length = 20, updatable = false)
    private DigitalAccessType accessType;

    @Column(name = "accessed_at", nullable = false, updatable = false)
    private Instant accessedAt;

    protected DigitalEditionAccess() {
    }

    public DigitalEditionAccess(Book book, UserAccount user, DigitalAccessType accessType) {
        this.book = book;
        this.user = user;
        this.accessType = accessType;
        this.accessedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Book getBook() {
        return book;
    }

    public UserAccount getUser() {
        return user;
    }

    public DigitalAccessType getAccessType() {
        return accessType;
    }

    public Instant getAccessedAt() {
        return accessedAt;
    }
}
