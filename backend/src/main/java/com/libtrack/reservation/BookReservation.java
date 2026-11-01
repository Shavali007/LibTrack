package com.libtrack.reservation;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.circulation.BorrowRequest;
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
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "book_reservation",
        indexes = {
                @Index(name = "idx_book_reservation_book_status", columnList = "book_id, status"),
                @Index(name = "idx_book_reservation_student", columnList = "student_account_id"),
                @Index(name = "idx_book_reservation_created", columnList = "created_at"),
                @Index(name = "idx_book_reservation_copy", columnList = "assigned_copy_id"),
                @Index(name = "idx_book_reservation_hold_expires", columnList = "status, hold_expires_at")
        }
)
public class BookReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false, updatable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_account_id", nullable = false, updatable = false)
    private UserAccount student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_copy_id")
    private BookCopy assignedCopy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrow_request_id")
    private BorrowRequest borrowRequest;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ReservationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "hold_started_at")
    private Instant holdStartedAt;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "expired_at")
    private Instant expiredAt;

    protected BookReservation() {
    }

    public BookReservation(Book book, UserAccount student, ReservationStatus status, Instant createdAt) {
        this.book = Objects.requireNonNull(book, "book must not be null");
        this.student = Objects.requireNonNull(student, "student must not be null");
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
    }

    public void assignCopyAndHold(BookCopy copy, BorrowRequest request, Instant holdStartedAt, Instant holdExpiresAt) {
        this.assignedCopy = copy;
        this.borrowRequest = request;
        this.status = ReservationStatus.READY_FOR_PICKUP;
        this.holdStartedAt = holdStartedAt;
        this.holdExpiresAt = holdExpiresAt;
    }

    public void markCompleted(Instant completedAt) {
        this.status = ReservationStatus.COMPLETED;
        this.completedAt = completedAt;
    }

    public void cancel(Instant cancelledAt) {
        this.status = ReservationStatus.CANCELLED;
        this.cancelledAt = cancelledAt;
        this.assignedCopy = null;
    }

    public void expire(Instant expiredAt) {
        this.status = ReservationStatus.EXPIRED;
        this.expiredAt = expiredAt;
        this.assignedCopy = null;
    }

    public void updateStatus(ReservationStatus newStatus) {
        this.status = newStatus;
    }

    public void setBorrowRequest(BorrowRequest borrowRequest) {
        this.borrowRequest = borrowRequest;
    }

    public UUID getId() {
        return id;
    }

    public Book getBook() {
        return book;
    }

    public UserAccount getStudent() {
        return student;
    }

    public BookCopy getAssignedCopy() {
        return assignedCopy;
    }

    public BorrowRequest getBorrowRequest() {
        return borrowRequest;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getHoldStartedAt() {
        return holdStartedAt;
    }

    public Instant getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public Instant getExpiredAt() {
        return expiredAt;
    }
}
