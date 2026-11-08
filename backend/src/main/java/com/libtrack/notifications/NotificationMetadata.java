package com.libtrack.notifications;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record NotificationMetadata(
    UUID bookId,
    String bookTitle,
    String bookAuthor,
    String bookSubject,
    String bookCoverUrl,
    UUID categoryId,
    UUID loanId,
    String loanDisplayCode,
    LocalDate dueDate,
    Integer daysRemaining,
    Boolean canRenew,
    Integer queuePosition,
    String pickupDeadline,
    BigDecimal fineAmount,
    String applicantName,
    String applicantEmail,
    String status,
    String infoAlert
) {
    public static NotificationMetadata empty() {
        return new NotificationMetadata(
            null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );
    }
}
