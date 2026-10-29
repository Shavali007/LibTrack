package com.libtrack.notifications;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.libtrack.circulation.Loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "due_date_reminder_log", uniqueConstraints = {
        @UniqueConstraint(name = "uq_loan_due_reminder", columnNames = {"loan_id", "due_date", "reminder_type"})
})
public class DueDateReminderLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false, updatable = false)
    private Loan loan;

    @Column(name = "due_date", nullable = false, updatable = false)
    private LocalDate dueDate;

    @Column(name = "reminder_type", nullable = false, length = 30, updatable = false)
    private String reminderType;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    protected DueDateReminderLog() {}

    public DueDateReminderLog(Loan loan, LocalDate dueDate, String reminderType, Instant sentAt) {
        this.loan = loan;
        this.dueDate = dueDate;
        this.reminderType = reminderType;
        this.sentAt = sentAt;
    }

    public UUID getId() { return id; }
    public Loan getLoan() { return loan; }
    public LocalDate getDueDate() { return dueDate; }
    public String getReminderType() { return reminderType; }
    public Instant getSentAt() { return sentAt; }
}
