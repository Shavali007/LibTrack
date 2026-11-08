package com.libtrack.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.notifications.NotificationService;
import com.libtrack.notifications.UpdateNotificationPreferencesRequest;

@LibTrackIntegrationTest
@Transactional
class UserSettingsIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private NotificationService notificationService;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount student;
    private UserAccount faculty;
    private UserAccount librarian;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian(
                "librarian." + UUID.randomUUID().toString().substring(0, 8) + "@libtrack.local",
                encoder.encode("LibrarianPass123!")));

        student = accounts.save(UserAccount.provisionMember(
                "mahammad." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in",
                encoder.encode("StudentPass123!"),
                AccountRole.STUDENT,
                "23MIC" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(),
                librarian.getId(),
                Instant.now(),
                "Mahammad"
        ));
        student.setDepartment("Computer Science and Engineering (CSE)");
        accounts.save(student);

        faculty = accounts.save(UserAccount.provisionMember(
                "ramesh." + UUID.randomUUID().toString().substring(0, 8) + "@vitap.ac.in",
                encoder.encode("FacultyPass123!"),
                AccountRole.FACULTY,
                "EMP" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(),
                librarian.getId(),
                Instant.now(),
                "Dr. K. Ramesh"
        ));
        faculty.setDepartment("Computer Science and Engineering (CSE)");
        accounts.save(faculty);
    }

    @Test
    @DisplayName("1. Student fetches settings with account details and notification preferences")
    void testStudentGetSettings() throws Exception {
        mvc.perform(get("/api/v1/users/me/settings")
                        .with(user(new AccountUserDetails(student))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Mahammad"))
                .andExpect(jsonPath("$.username").value("Mahammad"))
                .andExpect(jsonPath("$.email").value(student.getEmail()))
                .andExpect(jsonPath("$.institutionalId").value(student.getInstitutionalId()))
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering (CSE)"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.notificationPreferences.borrowRequestUpdates").value(true))
                .andExpect(jsonPath("$.notificationPreferences.loanDueReminders").value(true))
                .andExpect(jsonPath("$.notificationPreferences.overdueFineAlerts").value(true))
                .andExpect(jsonPath("$.notificationPreferences.bookRecommendations").value(true))
                .andExpect(jsonPath("$.notificationPreferences.newBookArrivals").value(true))
                .andExpect(jsonPath("$.notificationPreferences.wishlistBookAlerts").value(true))
                .andExpect(jsonPath("$.notificationPreferences.departmentBookArrivals").value(true))
                .andExpect(jsonPath("$.notificationPreferences.libraryAnnouncements").value(true));
    }

    @Test
    @DisplayName("2. Faculty fetches settings with designation")
    void testFacultyGetSettings() throws Exception {
        mvc.perform(get("/api/v1/users/me/settings")
                        .with(user(new AccountUserDetails(faculty))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Dr. K. Ramesh"))
                .andExpect(jsonPath("$.username").value("Dr. K. Ramesh"))
                .andExpect(jsonPath("$.institutionalId").value(faculty.getInstitutionalId()))
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering (CSE)"))
                .andExpect(jsonPath("$.designation").value("Associate Professor"))
                .andExpect(jsonPath("$.role").value("FACULTY"));
    }

    @Test
    @DisplayName("3. Unauthenticated request to settings returns 401")
    void testUnauthenticatedSettings() throws Exception {
        mvc.perform(get("/api/v1/users/me/settings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("4. Librarian can access settings and retrieve notification preferences")
    void testLibrarianSettingsAccess() throws Exception {
        mvc.perform(get("/api/v1/users/me/settings")
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("LIBRARIAN"))
                .andExpect(jsonPath("$.notificationPreferences.borrowRequestUpdates").value(true))
                .andExpect(jsonPath("$.notificationPreferences.loanDueReminders").value(true))
                .andExpect(jsonPath("$.notificationPreferences.overdueFineAlerts").value(true))
                .andExpect(jsonPath("$.notificationPreferences.bookRecommendations").value(true))
                .andExpect(jsonPath("$.notificationPreferences.newBookArrivals").value(true))
                .andExpect(jsonPath("$.notificationPreferences.wishlistBookAlerts").value(true))
                .andExpect(jsonPath("$.notificationPreferences.departmentBookArrivals").value(true))
                .andExpect(jsonPath("$.notificationPreferences.libraryAnnouncements").value(true));

        mvc.perform(put("/api/v1/users/me/notifications")
                        .with(csrf())
                        .with(user(new AccountUserDetails(librarian)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateNotificationPreferencesRequest(
                                false, false, true, false, true, false, true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(false))
                .andExpect(jsonPath("$.loanDueReminders").value(false))
                .andExpect(jsonPath("$.overdueFineAlerts").value(true))
                .andExpect(jsonPath("$.bookRecommendations").value(false))
                .andExpect(jsonPath("$.newBookArrivals").value(true))
                .andExpect(jsonPath("$.departmentBookArrivals").value(false))
                .andExpect(jsonPath("$.libraryAnnouncements").value(true));
    }

    @Test
    @DisplayName("4b. Partial preference update leaves unspecified preferences unchanged")
    void testPartialPreferenceUpdate() throws Exception {
        // First set known state
        mvc.perform(put("/api/v1/users/me/notifications")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateNotificationPreferencesRequest(
                                true, true, true, true, true, true, true
                        ))))
                .andExpect(status().isOk());

        // Now partially update only overdueFineAlerts to false
        UpdateNotificationPreferencesRequest partial = new UpdateNotificationPreferencesRequest(
                null, null, false, null, null, null, null
        );

        mvc.perform(put("/api/v1/users/me/notifications")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(partial)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(true))
                .andExpect(jsonPath("$.loanDueReminders").value(true))
                .andExpect(jsonPath("$.overdueFineAlerts").value(false))
                .andExpect(jsonPath("$.bookRecommendations").value(true))
                .andExpect(jsonPath("$.newBookArrivals").value(true))
                .andExpect(jsonPath("$.departmentBookArrivals").value(true))
                .andExpect(jsonPath("$.libraryAnnouncements").value(true));
    }

    @Test
    @DisplayName("4c. Faculty can retrieve and update personal preferences independently")
    void testFacultyNotificationPreferences() throws Exception {
        mvc.perform(get("/api/v1/users/me/notifications")
                        .with(user(new AccountUserDetails(faculty))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(true));

        mvc.perform(put("/api/v1/users/me/notifications")
                        .with(csrf())
                        .with(user(new AccountUserDetails(faculty)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateNotificationPreferencesRequest(
                                false, true, false, true, false
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(false))
                .andExpect(jsonPath("$.bookRecommendations").value(true));

        // Verify student preferences remain unaffected
        mvc.perform(get("/api/v1/users/me/notifications")
                        .with(user(new AccountUserDetails(student))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(true));
    }

    @Test
    @DisplayName("5. Student successfully updates username")
    void testStudentUpdateUsername() throws Exception {
        mvc.perform(put("/api/v1/users/me/username")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateUsernameRequest("Mahammad.Ali"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Mahammad.Ali"));

        UserAccount updated = accounts.findById(student.getId()).orElseThrow();
        assertEquals("Mahammad.Ali", updated.getDisplayName());
        assertEquals(student.getInstitutionalId(), updated.getInstitutionalId());
        assertEquals(AccountRole.STUDENT, updated.getRole());
    }

    @Test
    @DisplayName("6. Duplicate username returns 409 Conflict")
    void testDuplicateUsernameConflict() throws Exception {
        // Attempt to set student's username to Dr. K. Ramesh (case insensitive)
        mvc.perform(put("/api/v1/users/me/username")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateUsernameRequest("dr. k. ramesh"))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("7. Invalid username formats return 400 Bad Request")
    void testInvalidUsernameValidation() throws Exception {
        // Too short (< 2)
        mvc.perform(put("/api/v1/users/me/username")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateUsernameRequest("A"))))
                .andExpect(status().isBadRequest());

        // Blank
        mvc.perform(put("/api/v1/users/me/username")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateUsernameRequest("   "))))
                .andExpect(status().isBadRequest());

        // Disallowed special chars
        mvc.perform(put("/api/v1/users/me/username")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new UpdateUsernameRequest("bad<script>"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("8. Notification preferences update persists and controls notification dispatch")
    void testNotificationPreferencesAndSuppression() throws Exception {
        UpdateNotificationPreferencesRequest updateReq = new UpdateNotificationPreferencesRequest(
                false, // borrowRequestUpdates = off
                true,  // loanDueReminders = on
                false, // overdueFineAlerts = off
                false, // bookRecommendations = off
                true,  // newBookArrivals = on
                false, // wishlistBookAlerts = off
                false, // departmentBookArrivals = off
                true   // libraryAnnouncements = on
        );

        mvc.perform(put("/api/v1/users/me/notifications")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.borrowRequestUpdates").value(false))
                .andExpect(jsonPath("$.loanDueReminders").value(true))
                .andExpect(jsonPath("$.overdueFineAlerts").value(false))
                .andExpect(jsonPath("$.bookRecommendations").value(false))
                .andExpect(jsonPath("$.newBookArrivals").value(true))
                .andExpect(jsonPath("$.wishlistBookAlerts").value(false))
                .andExpect(jsonPath("$.departmentBookArrivals").value(false))
                .andExpect(jsonPath("$.libraryAnnouncements").value(true));

        // Test that notificationService suppresses disabled categories
        var suppressed = notificationService.sendMemberNotification(
                student.getId(),
                "Borrow Request Approved",
                "Your request has been approved",
                "Your request has been approved",
                "BORROW_REQUEST",
                "BORROW_REQUEST",
                UUID.randomUUID(),
                "/workspace/my/requests",
                null
        );
        assertTrue(suppressed.isEmpty(), "BORROW_REQUEST notification should be suppressed when toggled off");

        // Test that allowed category is delivered
        var allowed = notificationService.sendMemberNotification(
                student.getId(),
                "Due Date Reminder",
                "Your book is due tomorrow",
                "Your book is due tomorrow",
                "DUE_DATE",
                "LOAN",
                UUID.randomUUID(),
                "/workspace/my/borrowings",
                null
        );
        assertTrue(allowed.isPresent(), "DUE_DATE notification should be allowed when toggled on");
    }

    @Test
    @DisplayName("9. Change password validates current password and updates hash")
    void testChangePasswordFlow() throws Exception {
        // Wrong current password returns 400
        mvc.perform(put("/api/v1/users/me/password")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new ChangePasswordRequest(
                                "WrongPassword123!",
                                "NewSecurePass123!",
                                "NewSecurePass123!"
                        ))))
                .andExpect(status().isBadRequest());

        // Weak new password returns 400
        mvc.perform(put("/api/v1/users/me/password")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new ChangePasswordRequest(
                                "StudentPass123!",
                                "weak",
                                "weak"
                        ))))
                .andExpect(status().isBadRequest());

        // Mismatched confirmation returns 400
        mvc.perform(put("/api/v1/users/me/password")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new ChangePasswordRequest(
                                "StudentPass123!",
                                "NewSecurePass123!",
                                "DifferentPass123!"
                        ))))
                .andExpect(status().isBadRequest());

        // Valid password change succeeds
        mvc.perform(put("/api/v1/users/me/password")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new ChangePasswordRequest(
                                "StudentPass123!",
                                "NewSecurePass123!",
                                "NewSecurePass123!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        UserAccount updated = accounts.findById(student.getId()).orElseThrow();
        assertTrue(encoder.matches("NewSecurePass123!", updated.getPasswordHash()));
        assertFalse(encoder.matches("StudentPass123!", updated.getPasswordHash()));
    }
}
