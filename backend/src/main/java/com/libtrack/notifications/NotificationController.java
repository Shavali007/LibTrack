package com.libtrack.notifications;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private static AccountUserDetails userDetails(Authentication auth) {
        return (AccountUserDetails) auth.getPrincipal();
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationRecord>> getNotifications(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        return ResponseEntity.ok(notificationService.getNotificationsForUser(user.getId(), user.getRole()));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        long count = notificationService.getUnreadCount(user.getId(), user.getRole());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notifications/mark-all-read")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAllAsRead(user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/librarian/notifications")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<NotificationRecord> createNotification(@Valid @RequestBody CreateNotificationRequest request) {
        NotificationRecord record = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }
}
