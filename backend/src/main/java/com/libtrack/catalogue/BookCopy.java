package com.libtrack.catalogue;

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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "book_copy", uniqueConstraints = @UniqueConstraint(name = "uq_book_copy_identifier", columnNames = "copy_identifier"))
public class BookCopy {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "book_id", nullable = false)
    private Book book;
    @Column(name = "copy_identifier", nullable = false, length = 100)
    private String copyIdentifier;
    @Column(length = 120)
    private String location;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CopyStatus status;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BookCopy() {}
    public BookCopy(Book book, String copyIdentifier, String location) {
        this.book = book; this.copyIdentifier = copyIdentifier; this.location = location; this.status = CopyStatus.AVAILABLE;
    }
    public void update(String copyIdentifier, String location, CopyStatus status) {
        this.copyIdentifier = copyIdentifier; this.location = location; this.status = status;
    }
    @PrePersist void onCreate() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public UUID getId() { return id; }
    public Book getBook() { return book; }
    public String getCopyIdentifier() { return copyIdentifier; }
    public String getLocation() { return location; }
    public CopyStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
