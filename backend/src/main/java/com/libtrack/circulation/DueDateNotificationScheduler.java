package com.libtrack.circulation;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.notifications.NotificationService;

@Component
public class DueDateNotificationScheduler {
    private static final Logger log = LoggerFactory.getLogger(DueDateNotificationScheduler.class);
    private static final ZoneId KOLKATA_ZONE = ZoneId.of("Asia/Kolkata");

    private final LoanRepository loanRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public DueDateNotificationScheduler(LoanRepository loanRepository,
                                        NotificationService notificationService,
                                        Clock clock) {
        this.loanRepository = loanRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void runDueDateAndOverdueNotifications() {
        try {
            LocalDate today = LocalDate.now(clock.withZone(KOLKATA_ZONE));

            // Overdue loans notifications (Strictly: No 3-day or 2-day reminders)
            List<Loan> overdueLoans = loanRepository.findOverdueLoans(LoanStatus.ACTIVE, today);
            for (Loan loan : overdueLoans) {
                long overdueDays = ChronoUnit.DAYS.between(loan.getDueDate(), today);
                String dedupKey = "OVERDUE_NOTICE:" + loan.getId() + ":" + loan.getDueDate() + ":" + today;
                notificationService.sendMemberNotification(
                        loan.getBorrower().getId(),
                        "Overdue Notice",
                        "\"" + loan.getCopy().getBook().getTitle() + "\" is overdue by " + overdueDays + " day" + (overdueDays > 1 ? "s" : "") + ". Please return it soon.",
                        "Your borrowed book is overdue. Daily fines are actively accumulating. Please visit the circulation desk to return the book.",
                        "OVERDUE",
                        "LOAN",
                        loan.getId(),
                        "/workspace/my/borrowings",
                        dedupKey
                );
            }
        } catch (Exception ex) {
            log.error("Failed to run periodic overdue notification check: {}", ex.getMessage(), ex);
        }
    }
}
