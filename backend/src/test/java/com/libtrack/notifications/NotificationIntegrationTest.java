package com.libtrack.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@LibTrackIntegrationTest
@Transactional
class NotificationIntegrationTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UserAccount studentUser;
    private UserAccount facultyUser;
    private UserAccount librarianUser;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();

        studentUser = userAccountRepository.save(UserAccount.provisionMember(
                "student.test@vitapstudent.ac.in",
                passwordEncoder.encode("Password123!"),
                AccountRole.STUDENT,
                "23BCE0001",
                UUID.randomUUID(),
                java.time.Instant.now()
        ));
        studentUser.setDisplayName("Test Student");
        studentUser = userAccountRepository.save(studentUser);

        facultyUser = userAccountRepository.save(UserAccount.provisionMember(
                "faculty.test@vitap.ac.in",
                passwordEncoder.encode("Password123!"),
                AccountRole.FACULTY,
                null,
                UUID.randomUUID(),
                java.time.Instant.now()
        ));
        facultyUser.setDisplayName("Test Faculty");
        facultyUser = userAccountRepository.save(facultyUser);

        librarianUser = userAccountRepository.save(UserAccount.initialLibrarian(
                "librarian.test@vitap.ac.in",
                passwordEncoder.encode("Password123!")
        ));
        librarianUser.setDisplayName("Test Librarian");
        librarianUser = userAccountRepository.save(librarianUser);
    }

    @Test
    @DisplayName("Send member notification and verify dynamic unread counts and filters")
    void sendAndFilterNotifications() {
        notificationService.sendMemberNotification(
                studentUser.getId(),
                "Due Date Reminder",
                "Operating System Concepts is due soon.",
                "Full due message",
                "DUE_DATE",
                null,
                null,
                "/workspace/my/borrowings",
                "DUE_1"
        );

        notificationService.sendMemberNotification(
                studentUser.getId(),
                "Reservation Update",
                "Database Systems is ready for pickup.",
                "Full reservation message",
                "RESERVATION",
                null,
                null,
                "/workspace/my/reservations",
                "RES_1"
        );

        NotificationCountsResponse counts = notificationService.getNotificationCounts(studentUser.getId(), studentUser.getRole());
        assertThat(counts.all()).isEqualTo(2);
        assertThat(counts.unread()).isEqualTo(2);
        assertThat(counts.read()).isEqualTo(0);

        Page<NotificationRecord> unread = notificationService.getNotificationsForUser(
                studentUser.getId(), studentUser.getRole(), "UNREAD", "LATEST", 0, 10);
        assertThat(unread.getContent()).hasSize(2);

        NotificationRecord first = unread.getContent().get(0);
        notificationService.markAsRead(first.id(), studentUser.getId(), studentUser.getRole());

        counts = notificationService.getNotificationCounts(studentUser.getId(), studentUser.getRole());
        assertThat(counts.all()).isEqualTo(2);
        assertThat(counts.unread()).isEqualTo(1);
        assertThat(counts.read()).isEqualTo(1);

        Page<NotificationRecord> readItems = notificationService.getNotificationsForUser(
                studentUser.getId(), studentUser.getRole(), "READ", "LATEST", 0, 10);
        assertThat(readItems.getContent()).hasSize(1);
        assertThat(readItems.getContent().get(0).id()).isEqualTo(first.id());
    }

    @Test
    @DisplayName("Deduplication prevents sending duplicate notifications")
    void deduplicationPreventsDuplicates() {
        Optional<AppNotification> n1 = notificationService.sendMemberNotification(
                studentUser.getId(),
                "Due Date Reminder",
                "Book due soon",
                null,
                "DUE_DATE",
                null,
                null,
                "/workspace/my/borrowings",
                "DEDUP_TEST_1"
        );
        assertThat(n1).isPresent();

        Optional<AppNotification> n2 = notificationService.sendMemberNotification(
                studentUser.getId(),
                "Due Date Reminder",
                "Book due soon",
                null,
                "DUE_DATE",
                null,
                null,
                "/workspace/my/borrowings",
                "DEDUP_TEST_1"
        );
        assertThat(n2).isEmpty();

        assertThat(notificationService.getUnreadCount(studentUser.getId(), studentUser.getRole())).isEqualTo(1);
    }

    @Test
    @DisplayName("User ownership prevents accessing or modifying another member's notifications")
    void ownershipValidation() {
        notificationService.sendMemberNotification(
                studentUser.getId(),
                "Private Alert",
                "Only for student",
                null,
                "GENERAL",
                null,
                null,
                null,
                null
        );

        Page<NotificationRecord> studentPage = notificationService.getNotificationsForUser(
                studentUser.getId(), studentUser.getRole(), "ALL", "LATEST", 0, 10);
        UUID studentNotifId = studentPage.getContent().get(0).id();

        // Faculty should not be able to get or mark read
        assertThrows(IllegalArgumentException.class, () ->
                notificationService.getNotification(studentNotifId, facultyUser.getId(), facultyUser.getRole()));

        assertThrows(IllegalArgumentException.class, () ->
                notificationService.markAsRead(studentNotifId, facultyUser.getId(), facultyUser.getRole()));

        assertThrows(IllegalArgumentException.class, () ->
                notificationService.markAsUnread(studentNotifId, facultyUser.getId(), facultyUser.getRole()));
    }

    @Test
    @DisplayName("Mark all as read updates all unread notifications for authenticated user")
    void markAllAsRead() {
        notificationService.sendMemberNotification(
                studentUser.getId(), "Title 1", "Message 1", null, "GENERAL", null, null, null, null);
        notificationService.sendMemberNotification(
                studentUser.getId(), "Title 2", "Message 2", null, "GENERAL", null, null, null, null);

        assertThat(notificationService.getUnreadCount(studentUser.getId(), studentUser.getRole())).isEqualTo(2);

        notificationService.markAllAsRead(studentUser.getId(), studentUser.getRole());

        assertThat(notificationService.getUnreadCount(studentUser.getId(), studentUser.getRole())).isEqualTo(0);
        NotificationCountsResponse counts = notificationService.getNotificationCounts(studentUser.getId(), studentUser.getRole());
        assertThat(counts.all()).isEqualTo(2);
        assertThat(counts.unread()).isEqualTo(0);
        assertThat(counts.read()).isEqualTo(2);
    }

    @Test
    @DisplayName("Clear all deletes only the authenticated user's notifications")
    void clearAllDeletesOnlyOwnNotifications() {
        notificationService.sendMemberNotification(
                studentUser.getId(), "Student Alert", "Student Msg", null, "GENERAL", null, null, null, null);
        notificationService.sendMemberNotification(
                facultyUser.getId(), "Faculty Alert", "Faculty Msg", null, "GENERAL", null, null, null, null);

        assertThat(notificationService.getNotificationCounts(studentUser.getId(), studentUser.getRole()).all()).isEqualTo(1);
        assertThat(notificationService.getNotificationCounts(facultyUser.getId(), facultyUser.getRole()).all()).isEqualTo(1);

        notificationService.clearAllForUser(studentUser.getId());

        assertThat(notificationService.getNotificationCounts(studentUser.getId(), studentUser.getRole()).all()).isEqualTo(0);
        assertThat(notificationService.getNotificationCounts(facultyUser.getId(), facultyUser.getRole()).all()).isEqualTo(1);
    }
}
