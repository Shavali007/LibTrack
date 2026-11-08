package com.libtrack.notifications;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;
import com.libtrack.fines.FineRepository;
import com.libtrack.fines.FineStatus;
import com.libtrack.reservation.BookReservationRepository;
import com.libtrack.reservation.ReservationStatus;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserAccountRepository accountRepository;
    private final BookRepository bookRepository;
    private final LoanRepository loanRepository;
    private final BookReservationRepository reservationRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final FineRepository fineRepository;
    private final UserNotificationPreferenceRepository preferenceRepository;
    private final Clock clock;

    public NotificationService(NotificationRepository notificationRepository,
                               UserAccountRepository accountRepository,
                               BookRepository bookRepository,
                               LoanRepository loanRepository,
                               BookReservationRepository reservationRepository,
                               BorrowRequestRepository borrowRequestRepository,
                               FineRepository fineRepository,
                               UserNotificationPreferenceRepository preferenceRepository,
                               Clock clock) {
        this.notificationRepository = notificationRepository;
        this.accountRepository = accountRepository;
        this.bookRepository = bookRepository;
        this.loanRepository = loanRepository;
        this.reservationRepository = reservationRepository;
        this.borrowRequestRepository = borrowRequestRepository;
        this.fineRepository = fineRepository;
        this.preferenceRepository = preferenceRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<NotificationRecord> getNotificationsForUser(UUID userId, AccountRole role,
                                                            String filter, String sortDirection,
                                                            int page, int size) {
        Sort sort = "OLDEST".equalsIgnoreCase(sortDirection)
                ? Sort.by(Sort.Direction.ASC, "createdAt")
                : Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)), sort);

        Page<AppNotification> pageResult;
        if ("UNREAD".equalsIgnoreCase(filter)) {
            pageResult = notificationRepository.findForUserByReadStatus(userId, role, false, pageable);
        } else if ("READ".equalsIgnoreCase(filter)) {
            pageResult = notificationRepository.findForUserByReadStatus(userId, role, true, pageable);
        } else {
            pageResult = notificationRepository.findForUser(userId, role, pageable);
        }

        return pageResult.map(this::toRecord);
    }

    @Transactional(readOnly = true)
    public List<NotificationRecord> getNotificationsForUser(UUID userId, AccountRole role) {
        return notificationRepository.findForUser(userId, role)
                .stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationRecord> getLatestDropdownNotifications(UUID userId, AccountRole role, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findForUser(userId, role, pageable)
                .stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId, AccountRole role) {
        return notificationRepository.countUnreadForUser(userId, role);
    }

    @Transactional(readOnly = true)
    public NotificationCountsResponse getNotificationCounts(UUID userId, AccountRole role) {
        long all = notificationRepository.countForUser(userId, role);
        long unread = notificationRepository.countUnreadForUser(userId, role);
        long read = notificationRepository.countReadForUser(userId, role);
        return new NotificationCountsResponse(all, unread, read);
    }

    @Transactional(readOnly = true)
    public NotificationRecord getNotification(UUID id, UUID userId, AccountRole role) {
        AppNotification notification = notificationRepository.findByIdAndUser(id, userId, role)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + id));
        return toRecord(notification);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId, AccountRole role) {
        AppNotification notification = notificationRepository.findByIdAndUser(notificationId, userId, role)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));
        notification.markRead(Instant.now(clock));
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.markRead(Instant.now(clock));
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAsUnread(UUID notificationId, UUID userId, AccountRole role) {
        AppNotification notification = notificationRepository.findByIdAndUser(notificationId, userId, role)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));
        notification.markUnread();
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId, AccountRole role) {
        notificationRepository.markAllReadForUser(userId, role, Instant.now(clock));
    }

    @Transactional
    public void clearAllForUser(UUID userId) {
        notificationRepository.deleteForUser(userId);
    }

    @Transactional
    public Optional<AppNotification> sendEventNotification(
            UUID recipientAccountId,
            AccountRole targetRole,
            String title,
            String message,
            String fullMessage,
            String category,
            String relatedEntityType,
            UUID relatedEntityId,
            String actionRoute,
            String dedupKey) {

        if (dedupKey != null && !dedupKey.isBlank() && notificationRepository.existsByDedupKey(dedupKey)) {
            return Optional.empty();
        }

        if (recipientAccountId != null && !isNotificationAllowed(recipientAccountId, category)) {
            return Optional.empty();
        }

        UserAccount recipient = null;
        if (recipientAccountId != null) {
            recipient = accountRepository.findById(recipientAccountId).orElse(null);
        }

        Instant now = Instant.now(clock);
        AppNotification notification = new AppNotification(
                UUID.randomUUID(),
                recipient,
                targetRole,
                title.trim(),
                message.trim(),
                fullMessage != null ? fullMessage.trim() : null,
                category.trim(),
                relatedEntityType,
                relatedEntityId,
                actionRoute,
                dedupKey,
                false,
                null,
                now
        );

        return Optional.of(notificationRepository.save(notification));
    }

    public boolean isNotificationAllowed(UUID userId, String category) {
        if (userId == null || category == null || category.isBlank() || preferenceRepository == null) {
            return true;
        }
        String cat = category.trim().toUpperCase();
        if ("SECURITY".equals(cat) || "ACCOUNT".equals(cat) || "AUTH".equals(cat) || "VERIFICATION".equals(cat)) {
            return true;
        }
        return preferenceRepository.findByUserAccountId(userId)
                .map(pref -> {
                    if (cat.contains("BORROW") || "LOAN".equals(cat) || cat.contains("BOOK_ISSUED")) {
                        return pref.isBorrowRequestUpdates();
                    } else if (cat.contains("DUE") || cat.contains("REMINDER")) {
                        return pref.isLoanDueReminders();
                    } else if (cat.contains("OVERDUE") || cat.contains("FINE")) {
                        return pref.isOverdueFineAlerts();
                    } else if (cat.contains("RECOMMEND")) {
                        return pref.isBookRecommendations();
                    } else if (cat.contains("DEPT") || cat.contains("DEPARTMENT")) {
                        return pref.isDepartmentBookArrivals();
                    } else if (cat.contains("WISHLIST")) {
                        return pref.isWishlistBookAlerts();
                    } else if (cat.contains("NEW_BOOK") || cat.contains("CATALOGUE") || cat.contains("ARRIVAL")) {
                        return pref.isNewBookArrivals();
                    } else if (cat.contains("ANNOUNCE")) {
                        return pref.isLibraryAnnouncements();
                    }
                    return true;
                })
                .orElse(true);
    }

    @Transactional
    public Optional<AppNotification> sendMemberNotification(
            UUID recipientAccountId,
            String title,
            String message,
            String fullMessage,
            String category,
            String relatedEntityType,
            UUID relatedEntityId,
            String actionRoute,
            String dedupKey) {
        return sendEventNotification(
                recipientAccountId,
                null,
                title,
                message,
                fullMessage,
                category,
                relatedEntityType,
                relatedEntityId,
                actionRoute,
                dedupKey
        );
    }

    @Transactional
    public Optional<AppNotification> sendRoleNotification(
            AccountRole targetRole,
            String title,
            String message,
            String fullMessage,
            String category,
            String relatedEntityType,
            UUID relatedEntityId,
            String actionRoute,
            String dedupKey) {
        return sendEventNotification(
                null,
                targetRole,
                title,
                message,
                fullMessage,
                category,
                relatedEntityType,
                relatedEntityId,
                actionRoute,
                dedupKey
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public NotificationRecord createNotification(CreateNotificationRequest request) {
        UserAccount recipient = null;
        if (request.recipientAccountId() != null) {
            recipient = accountRepository.findById(request.recipientAccountId()).orElse(null);
        }

        Instant now = Instant.now(clock);
        AppNotification notification = new AppNotification(
                UUID.randomUUID(),
                recipient,
                request.targetRole(),
                request.title().trim(),
                request.message().trim(),
                null,
                request.category().trim(),
                null,
                null,
                null,
                null,
                false,
                null,
                now
        );

        notification = notificationRepository.save(notification);
        return toRecord(notification);
    }

    @Transactional
    public NotificationRecord sendSystemNotification(UUID recipientAccountId, String title, String message, String category) {
        if (recipientAccountId != null && !isNotificationAllowed(recipientAccountId, category)) {
            return null;
        }
        UserAccount recipient = accountRepository.findById(recipientAccountId).orElse(null);
        Instant now = Instant.now(clock);
        AppNotification notification = new AppNotification(
                UUID.randomUUID(),
                recipient,
                null,
                title.trim(),
                message.trim(),
                null,
                category.trim(),
                null,
                null,
                null,
                null,
                false,
                null,
                now
        );
        notification = notificationRepository.save(notification);
        return toRecord(notification);
    }

    public NotificationRecord toRecord(AppNotification n) {
        NotificationMetadata metadata = resolveMetadata(n);
        return new NotificationRecord(
                n.getId(),
                n.getRecipient() != null ? n.getRecipient().getId() : null,
                n.getTargetRole() != null ? n.getTargetRole().name() : null,
                n.getTitle(),
                n.getMessage(),
                n.getFullMessage(),
                n.getCategory(),
                n.getRelatedEntityType(),
                n.getRelatedEntityId(),
                n.getActionRoute(),
                n.isRead(),
                n.getReadAt(),
                n.getCreatedAt(),
                metadata
        );
    }

    private NotificationMetadata resolveMetadata(AppNotification n) {
        if (n.getRelatedEntityType() == null || n.getRelatedEntityId() == null) {
            return NotificationMetadata.empty();
        }
        String entityType = n.getRelatedEntityType().toUpperCase();
        UUID entityId = n.getRelatedEntityId();

        try {
            if ("LOAN".equals(entityType)) {
                return loanRepository.findById(entityId).map(loan -> {
                    var book = loan.getCopy().getBook();
                    String authors = book.getAuthors().stream()
                            .map(a -> a.getName())
                            .collect(Collectors.joining(", "));
                    String subjects = book.getCategories().stream()
                            .map(c -> c.getName())
                            .collect(Collectors.joining(", "));
                    String displayCode = "LN-" + loan.getId().toString().substring(0, 8).toUpperCase();
                    LocalDate today = LocalDate.now(clock);
                    int daysRemaining = (int) ChronoUnit.DAYS.between(today, loan.getDueDate());
                    boolean canRenew = loan.getStatus() == LoanStatus.ACTIVE && loan.getRenewalCount() < 1;
                    String alert = loan.getStatus() == LoanStatus.ACTIVE
                            ? (daysRemaining < 0
                            ? "This book is overdue. Please return it to the circulation desk to avoid further fines."
                            : "Please return or renew the book before the due date to avoid it being marked as overdue.")
                            : "Loan recorded as " + loan.getStatus().name() + ".";
                    return new NotificationMetadata(
                            book.getId(),
                            book.getTitle(),
                            authors.isBlank() ? "Unknown Author" : authors,
                            subjects.isBlank() ? "General" : subjects,
                            book.getCoverImageUrl(),
                            null,
                            loan.getId(),
                            displayCode,
                            loan.getDueDate(),
                            daysRemaining,
                            canRenew,
                            null,
                            null,
                            null,
                            null,
                            null,
                            loan.getStatus().name(),
                            alert
                    );
                }).orElse(NotificationMetadata.empty());
            } else if ("RESERVATION".equals(entityType)) {
                return reservationRepository.findById(entityId).map(res -> {
                    var book = res.getBook();
                    String authors = book.getAuthors().stream()
                            .map(a -> a.getName())
                            .collect(Collectors.joining(", "));
                    String subjects = book.getCategories().stream()
                            .map(c -> c.getName())
                            .collect(Collectors.joining(", "));
                    Integer queuePosition = null;
                    if (res.getStatus() == ReservationStatus.WAITING_FOR_AVAILABILITY || res.getStatus() == ReservationStatus.IN_QUEUE) {
                        queuePosition = (int) reservationRepository.countWaitingAhead(res.getBook().getId(), res.getCreatedAt(), res.getId()) + 1;
                    }
                    String alert = res.getStatus() == ReservationStatus.READY_FOR_PICKUP
                            ? "Your reserved book is ready for pickup at the circulation desk."
                            : (queuePosition != null ? "You are currently #" + queuePosition + " in queue." : "Reservation status: " + res.getStatus().name());
                    String pickupDeadline = res.getHoldExpiresAt() != null ? formatHoldTime(res.getHoldExpiresAt()) : null;
                    return new NotificationMetadata(
                            book.getId(),
                            book.getTitle(),
                            authors.isBlank() ? "Unknown Author" : authors,
                            subjects.isBlank() ? "General" : subjects,
                            book.getCoverImageUrl(),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            queuePosition,
                            pickupDeadline,
                            null,
                            null,
                            null,
                            res.getStatus().name(),
                            alert
                    );
                }).orElse(NotificationMetadata.empty());
            } else if ("BORROW_REQUEST".equals(entityType)) {
                return borrowRequestRepository.findById(entityId).map(req -> {
                    var book = req.getBook();
                    String authors = book.getAuthors().stream()
                            .map(a -> a.getName())
                            .collect(Collectors.joining(", "));
                    String subjects = book.getCategories().stream()
                            .map(c -> c.getName())
                            .collect(Collectors.joining(", "));
                    String alert = req.getDecisionReason() != null && !req.getDecisionReason().isBlank()
                            ? "Librarian note: " + req.getDecisionReason()
                            : (req.getStatus() == BorrowRequestStatus.APPROVED
                            ? "Your request has been approved. Please collect your book from the circulation desk."
                            : (req.getStatus() == BorrowRequestStatus.REJECTED
                            ? "Your request was not approved by the librarian."
                            : "Your request is awaiting librarian review."));
                    return new NotificationMetadata(
                            book.getId(),
                            book.getTitle(),
                            authors.isBlank() ? "Unknown Author" : authors,
                            subjects.isBlank() ? "General" : subjects,
                            book.getCoverImageUrl(),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            req.getBorrower() != null ? req.getBorrower().getDisplayName() : null,
                            req.getBorrower() != null ? req.getBorrower().getEmail() : null,
                            req.getStatus().name(),
                            alert
                    );
                }).orElse(NotificationMetadata.empty());
            } else if ("FINE".equals(entityType)) {
                return fineRepository.findById(entityId).map(fine -> {
                    var loan = fine.getLoan();
                    var book = loan != null && loan.getCopy() != null ? loan.getCopy().getBook() : null;
                    String authors = book != null ? book.getAuthors().stream().map(a -> a.getName()).collect(Collectors.joining(", ")) : null;
                    String alert = fine.getStatus() == FineStatus.UNPAID
                            ? "Outstanding fine: ₹" + fine.getFineAmount() + ". Please clear at the circulation desk."
                            : "Fine of ₹" + fine.getFineAmount() + " was successfully paid.";
                    return new NotificationMetadata(
                            book != null ? book.getId() : null,
                            book != null ? book.getTitle() : null,
                            authors,
                            book != null ? book.getCategories().stream().map(c -> c.getName()).collect(Collectors.joining(", ")) : null,
                            book != null ? book.getCoverImageUrl() : null,
                            null,
                            loan != null ? loan.getId() : null,
                            loan != null ? "LN-" + loan.getId().toString().substring(0, 8).toUpperCase() : null,
                            loan != null ? loan.getDueDate() : null,
                            null,
                            null,
                            null,
                            null,
                            fine.getFineAmount(),
                            fine.getBorrower() != null ? fine.getBorrower().getDisplayName() : null,
                            fine.getBorrower() != null ? fine.getBorrower().getEmail() : null,
                            fine.getStatus().name(),
                            alert
                    );
                }).orElse(NotificationMetadata.empty());
            } else if ("BOOK".equals(entityType)) {
                return bookRepository.findById(entityId).map(book -> {
                    String authors = book.getAuthors().stream()
                            .map(a -> a.getName())
                            .collect(Collectors.joining(", "));
                    String subjects = book.getCategories().stream()
                            .map(c -> c.getName())
                            .collect(Collectors.joining(", "));
                    UUID primaryCategoryId = book.getCategories().isEmpty() ? null : book.getCategories().iterator().next().getId();
                    return new NotificationMetadata(
                            book.getId(),
                            book.getTitle(),
                            authors.isBlank() ? "Unknown Author" : authors,
                            subjects.isBlank() ? "General" : subjects,
                            book.getCoverImageUrl(),
                            primaryCategoryId,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            "AVAILABLE",
                            "Explore this recommended book."
                    );
                }).orElse(NotificationMetadata.empty());
            } else if ("MEMBER_REQUEST".equals(entityType)) {
                return accountRepository.findById(entityId).map(acc -> {
                    String alert = "Membership status: " + acc.getApprovalStatus().name();
                    return new NotificationMetadata(
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            acc.getDisplayName(),
                            acc.getEmail(),
                            acc.getApprovalStatus().name(),
                            alert
                    );
                }).orElse(NotificationMetadata.empty());
            }
        } catch (Exception ex) {
            // Graceful fallback for deleted or transient records
        }
        return NotificationMetadata.empty();
    }

    private String formatHoldTime(Instant expiry) {
        Instant now = clock.instant();
        if (expiry.isBefore(now)) return "Expired";
        Duration rem = Duration.between(now, expiry);
        long days = rem.toDays();
        long hours = rem.minusDays(days).toHours();
        if (days > 0) {
            return "Hold expires in " + days + " day" + (days > 1 ? "s " : " ") + hours + " hour" + (hours != 1 ? "s" : "");
        } else {
            return "Hold expires in " + hours + " hour" + (hours != 1 ? "s" : "");
        }
    }
}
