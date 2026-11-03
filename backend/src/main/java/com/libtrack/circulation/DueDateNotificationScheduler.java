package com.libtrack.circulation;

import java.time.Clock;
import java.time.LocalDate;
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
            LocalDate today = LocalDate.now(clock);

            // 1. Due in 3 days
            LocalDate dueIn3 = today.plusDays(3);
            List<Loan> loansDueIn3 = loanRepository.findByStatusAndDueDate(LoanStatus.ACTIVE, dueIn3);
            for (Loan loan : loansDueIn3) {
                String dedupKey = "DUE_REMINDER_3D:" + loan.getId() + ":" + loan.getDueDate();
                notificationService.sendMemberNotification(
                        loan.getBorrower().getId(),
                        "Due Date Reminder",
                        "Your borrowed book \"" + loan.getCopy().getBook().getTitle() + "\" is due in 3 days.",
                        "Your borrowed book is due soon. Please return or renew the book before " + loan.getDueDate() + " to avoid fines.",
                        "DUE_DATE",
                        "LOAN",
                        loan.getId(),
                        "/workspace/my/borrowings",
                        dedupKey
                );
            }

            // 2. Due in 2 days (as in reference mockup: "due in 2 days")
            LocalDate dueIn2 = today.plusDays(2);
            List<Loan> loansDueIn2 = loanRepository.findByStatusAndDueDate(LoanStatus.ACTIVE, dueIn2);
            for (Loan loan : loansDueIn2) {
                String dedupKey = "DUE_REMINDER_2D:" + loan.getId() + ":" + loan.getDueDate();
                notificationService.sendMemberNotification(
                        loan.getBorrower().getId(),
                        "Due Date Reminder",
                        "Your borrowed book \"" + loan.getCopy().getBook().getTitle() + "\" is due in 2 days.",
                        "Your borrowed book is due soon.",
                        "DUE_DATE",
                        "LOAN",
                        loan.getId(),
                        "/workspace/my/borrowings",
                        dedupKey
                );
            }

            // 3. Due in 1 day (tomorrow)
            LocalDate dueIn1 = today.plusDays(1);
            List<Loan> loansDueIn1 = loanRepository.findByStatusAndDueDate(LoanStatus.ACTIVE, dueIn1);
            for (Loan loan : loansDueIn1) {
                String dedupKey = "DUE_REMINDER_1D:" + loan.getId() + ":" + loan.getDueDate();
                notificationService.sendMemberNotification(
                        loan.getBorrower().getId(),
                        "Due Date Reminder",
                        "Your borrowed book \"" + loan.getCopy().getBook().getTitle() + "\" is due tomorrow.",
                        "Your borrowed book is due tomorrow. Please return or renew it to avoid late fees.",
                        "DUE_DATE",
                        "LOAN",
                        loan.getId(),
                        "/workspace/my/borrowings",
                        dedupKey
                );
            }

            // 4. Overdue loans
            List<Loan> overdueLoans = loanRepository.findOverdueLoans(LoanStatus.ACTIVE, today);
            for (Loan loan : overdueLoans) {
                long overdueDays = ChronoUnit.DAYS.between(loan.getDueDate(), today);
                String dedupKey = "OVERDUE_NOTICE:" + loan.getId() + ":" + loan.getDueDate();
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
            log.error("Failed to run periodic due date/overdue notification check: {}", ex.getMessage(), ex);
        }
    }
}
