package com.libtrack.recommendation;

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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "book_recommendation")
public class BookRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculty_account_id", nullable = false)
    private UserAccount facultyAccount;

    @Column(length = 300)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecommendationStatus status = RecommendationStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    protected BookRecommendation() {}

    public BookRecommendation(Book book, UserAccount facultyAccount, String message) {
        this.book = book;
        this.facultyAccount = facultyAccount;
        this.message = message;
        this.status = RecommendationStatus.ACTIVE;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void updateMessage(String newMessage) {
        this.message = newMessage;
        this.updatedAt = Instant.now();
    }

    public void withdraw() {
        this.status = RecommendationStatus.WITHDRAWN;
        this.withdrawnAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reactivate(String newMessage) {
        this.message = newMessage;
        this.status = RecommendationStatus.ACTIVE;
        this.withdrawnAt = null;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Book getBook() {
        return book;
    }

    public UserAccount getFacultyAccount() {
        return facultyAccount;
    }

    public String getMessage() {
        return message;
    }

    public RecommendationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getWithdrawnAt() {
        return withdrawnAt;
    }
}
