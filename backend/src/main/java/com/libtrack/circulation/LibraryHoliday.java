package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "library_holiday")
public class LibraryHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(nullable = false, length = 160)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_account_id", nullable = false, updatable = false)
    private UserAccount createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LibraryHoliday() {}

    public LibraryHoliday(LocalDate fromDate, LocalDate toDate, String name, UserAccount actor) {
        if (fromDate == null || toDate == null) {
            throw new IllegalArgumentException("Holiday From Date and To Date are mandatory.");
        }
        if (toDate.isBefore(fromDate)) {
            throw new IllegalArgumentException("Holiday To Date cannot be earlier than From Date.");
        }
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.name = name;
        this.createdBy = actor;
        this.createdAt = Instant.now();
    }

    public LibraryHoliday(LocalDate singleDate, String name, UserAccount actor) {
        this(singleDate, singleDate, name, actor);
    }

    public void update(LocalDate fromDate, LocalDate toDate, String name) {
        if (fromDate == null || toDate == null) {
            throw new IllegalArgumentException("Holiday From Date and To Date are mandatory.");
        }
        if (toDate.isBefore(fromDate)) {
            throw new IllegalArgumentException("Holiday To Date cannot be earlier than From Date.");
        }
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.name = name;
    }

    public void update(LocalDate singleDate, String name) {
        update(singleDate, singleDate, name);
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getFromDate() {
        return fromDate;
    }

    public LocalDate getToDate() {
        return toDate;
    }

    public LocalDate getHolidayDate() {
        return fromDate;
    }

    public long getDurationDays() {
        return ChronoUnit.DAYS.between(fromDate, toDate) + 1;
    }

    public String getName() {
        return name;
    }

    public UserAccount getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
