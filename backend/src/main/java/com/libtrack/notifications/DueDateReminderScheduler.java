package com.libtrack.notifications;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;

@Service
public class DueDateReminderScheduler {
    private static final Logger log = LoggerFactory.getLogger(DueDateReminderScheduler.class);
    private static final ZoneId KOLKATA_ZONE = ZoneId.of("Asia/Kolkata");

    public static final String REMINDER_ONE_DAY_BEFORE = "ONE_DAY_BEFORE";
    public static final String REMINDER_DUE_DATE = "DUE_DATE";

    private final LoanRepository loanRepository;
    private final DueDateReminderLogRepository reminderLogRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public DueDateReminderScheduler(LoanRepository loanRepository,
                                    DueDateReminderLogRepository reminderLogRepository,
                                    NotificationService notificationService,
                                    Clock clock) {
        this.loanRepository = loanRepository;
        this.reminderLogRepository = reminderLogRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Kolkata")
    @Transactional
    public int sendDueReminders() {
        LocalDate today = LocalDate.now(clock.withZone(KOLKATA_ZONE));
        Instant now = Instant.now(clock);
        List<Loan> activeLoans = loanRepository.findByStatus(LoanStatus.ACTIVE);
        int sentCount = 0;

        for (Loan loan : activeLoans) {
            LocalDate dueDate = loan.getDueDate();
            String bookTitle = loan.getCopy().getBook().getTitle();

            // Reminder 1: Exactly 1 day before due date
            if (dueDate.minusDays(1).equals(today)) {
                if (!reminderLogRepository.existsByLoan_IdAndDueDateAndReminderType(loan.getId(), dueDate, REMINDER_ONE_DAY_BEFORE)) {
                    reminderLogRepository.save(new DueDateReminderLog(loan, dueDate, REMINDER_ONE_DAY_BEFORE, now));
                    if (notificationService.isNotificationAllowed(loan.getBorrower().getId(), "DUE_DATE")) {
                        notificationService.sendMemberNotification(
                                loan.getBorrower().getId(),
                                "Due Tomorrow: " + bookTitle,
                                "Your borrowed book '" + bookTitle + "' is due tomorrow (" + dueDate + "). Please return or renew it to avoid overdue fines.",
                                "Your loan for '" + bookTitle + "' is due tomorrow (" + dueDate + "). Please visit the library or renew online to avoid late fees.",
                                "DUE_DATE",
                                "LOAN",
                                loan.getId(),
                                "/workspace/my/borrowings",
                                "DUE_REMINDER_1D:" + loan.getId() + ":" + dueDate
                        );
                        sentCount++;
                    }
                    log.info("Sent 1-day due reminder for loan {} to borrower {}", loan.getId(), loan.getBorrower().getEmail());
                }
            }

            // Reminder 2: On the due date
            if (dueDate.equals(today)) {
                if (!reminderLogRepository.existsByLoan_IdAndDueDateAndReminderType(loan.getId(), dueDate, REMINDER_DUE_DATE)) {
                    reminderLogRepository.save(new DueDateReminderLog(loan, dueDate, REMINDER_DUE_DATE, now));
                    if (notificationService.isNotificationAllowed(loan.getBorrower().getId(), "DUE_DATE")) {
                        notificationService.sendMemberNotification(
                                loan.getBorrower().getId(),
                                "Due Today: " + bookTitle,
                                "Your borrowed book '" + bookTitle + "' is due today (" + dueDate + "). Please return or renew it today to avoid overdue fines.",
                                "Your loan for '" + bookTitle + "' is due today (" + dueDate + "). Please return the physical book or renew online before closing hours.",
                                "DUE_DATE",
                                "LOAN",
                                loan.getId(),
                                "/workspace/my/borrowings",
                                "DUE_REMINDER_TODAY:" + loan.getId() + ":" + dueDate
                        );
                        sentCount++;
                    }
                    log.info("Sent due-date reminder for loan {} to borrower {}", loan.getId(), loan.getBorrower().getEmail());
                }
            }
        }

        return sentCount;
    }
}
