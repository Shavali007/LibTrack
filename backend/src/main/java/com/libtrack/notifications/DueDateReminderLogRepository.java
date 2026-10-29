package com.libtrack.notifications;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DueDateReminderLogRepository extends JpaRepository<DueDateReminderLog, UUID> {
    boolean existsByLoan_IdAndDueDateAndReminderType(UUID loanId, LocalDate dueDate, String reminderType);
}
