package com.libtrack.notifications;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountUserDetails;
import com.libtrack.catalogue.PageResponse;

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
    public ResponseEntity<List<NotificationRecord>> getNotifications(
            Authentication auth,
            @RequestParam(required = false, defaultValue = "ALL") String filter,
            @RequestParam(required = false, defaultValue = "LATEST") String sort,
            @RequestParam(required = false) Integer limit) {
        AccountUserDetails user = userDetails(auth);
        if (limit != null && limit > 0) {
            return ResponseEntity.ok(notificationService.getLatestDropdownNotifications(user.getId(), user.getRole(), limit));
        }
        Page<NotificationRecord> page = notificationService.getNotificationsForUser(
                user.getId(), user.getRole(), filter, sort, 0, 100);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/notifications/paged")
    public ResponseEntity<PageResponse<NotificationRecord>> getPagedNotifications(
            Authentication auth,
            @RequestParam(required = false, defaultValue = "ALL") String filter,
            @RequestParam(required = false, defaultValue = "LATEST") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        AccountUserDetails user = userDetails(auth);
        Page<NotificationRecord> result = notificationService.getNotificationsForUser(
                user.getId(), user.getRole(), filter, sort, page, size);
        return ResponseEntity.ok(new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        ));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        long count = notificationService.getUnreadCount(user.getId(), user.getRole());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @GetMapping("/notifications/counts")
    public ResponseEntity<NotificationCountsResponse> getNotificationCounts(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        return ResponseEntity.ok(notificationService.getNotificationCounts(user.getId(), user.getRole()));
    }

    @GetMapping("/notifications/{id}")
    public ResponseEntity<NotificationRecord> getNotification(
            Authentication auth,
            @PathVariable UUID id) {
        AccountUserDetails user = userDetails(auth);
        return ResponseEntity.ok(notificationService.getNotification(id, user.getId(), user.getRole()));
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Void> patchMarkRead(
            Authentication auth,
            @PathVariable UUID id) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAsRead(id, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> postMarkRead(
            Authentication auth,
            @PathVariable UUID id) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAsRead(id, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/notifications/{id}/unread")
    public ResponseEntity<Void> patchMarkUnread(
            Authentication auth,
            @PathVariable UUID id) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAsUnread(id, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/notifications/read-all")
    public ResponseEntity<Void> patchMarkAllRead(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAllAsRead(user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notifications/mark-all-read")
    public ResponseEntity<Void> postMarkAllRead(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        notificationService.markAllAsRead(user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/notifications")
    public ResponseEntity<Void> clearAllNotifications(Authentication auth) {
        AccountUserDetails user = userDetails(auth);
        notificationService.clearAllForUser(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/librarian/notifications")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<NotificationRecord> createNotification(@Valid @RequestBody CreateNotificationRequest request) {
        NotificationRecord record = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }
}
