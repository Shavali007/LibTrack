package com.libtrack.notifications;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserAccountRepository accountRepository;
    private final Clock clock;

    public NotificationService(NotificationRepository notificationRepository,
                               UserAccountRepository accountRepository,
                               Clock clock) {
        this.notificationRepository = notificationRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<NotificationRecord> getNotificationsForUser(UUID userId, AccountRole role) {
        return notificationRepository.findForUser(userId, role)
                .stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId, AccountRole role) {
        return notificationRepository.countUnreadForUser(userId, role);
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(AppNotification::markRead);
    }

    @Transactional
    public void markAllAsRead(UUID userId, AccountRole role) {
        notificationRepository.markAllReadForUser(userId, role);
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
                request.category().trim(),
                false,
                now
        );

        notification = notificationRepository.save(notification);
        return toRecord(notification);
    }

    @Transactional
    public NotificationRecord sendSystemNotification(UUID recipientAccountId, String title, String message, String category) {
        UserAccount recipient = accountRepository.findById(recipientAccountId).orElse(null);
        Instant now = Instant.now(clock);
        AppNotification notification = new AppNotification(
                UUID.randomUUID(),
                recipient,
                null,
                title.trim(),
                message.trim(),
                category.trim(),
                false,
                now
        );
        notification = notificationRepository.save(notification);
        return toRecord(notification);
    }

    private NotificationRecord toRecord(AppNotification n) {
        return new NotificationRecord(
                n.getId(),
                n.getRecipient() != null ? n.getRecipient().getId() : null,
                n.getTargetRole() != null ? n.getTargetRole().name() : null,
                n.getTitle(),
                n.getMessage(),
                n.getCategory(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
