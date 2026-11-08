package com.libtrack.auth;

import java.util.Objects;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.notifications.NotificationPreferencesResponse;
import com.libtrack.notifications.UpdateNotificationPreferencesRequest;
import com.libtrack.notifications.UserNotificationPreference;
import com.libtrack.notifications.UserNotificationPreferenceRepository;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class UserSettingsService {

    private final UserAccountRepository userAccountRepository;
    private final UserNotificationPreferenceRepository userNotificationPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionRegistry sessionRegistry;

    public UserSettingsService(UserAccountRepository userAccountRepository,
                               UserNotificationPreferenceRepository userNotificationPreferenceRepository,
                               PasswordEncoder passwordEncoder,
                               SessionRegistry sessionRegistry) {
        this.userAccountRepository = userAccountRepository;
        this.userNotificationPreferenceRepository = userNotificationPreferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessionRegistry = sessionRegistry;
    }

    @Transactional
    public UserSettingsResponse getUserSettings(UUID accountId, AccountRole role) {
        enforceValidRole(role);
        UserAccount account = userAccountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found."));

        UserNotificationPreference pref = userNotificationPreferenceRepository.findByUserAccountId(accountId)
                .orElseGet(() -> userNotificationPreferenceRepository.saveAndFlush(new UserNotificationPreference(account)));
        NotificationPreferencesResponse prefResponse = NotificationPreferencesResponse.from(pref);

        String designation = switch (account.getRole()) {
            case LIBRARIAN -> "Library Administrator";
            case FACULTY -> "Associate Professor";
            case STUDENT -> "Student";
        };

        return new UserSettingsResponse(
                account.getId(),
                account.getDisplayName(),
                account.getDisplayName(),
                account.getDisplayName(),
                account.getEmail(),
                account.getInstitutionalId(),
                account.getDepartment(),
                designation,
                account.getRole(),
                prefResponse
        );
    }

    @Transactional
    public UsernameResponse updateUsername(UUID accountId, AccountRole role, String newUsername) {
        enforceValidRole(role);
        if (newUsername == null || newUsername.isBlank()) {
            throw new IllegalArgumentException("Username cannot be empty.");
        }
        String clean = newUsername.strip();
        if (clean.length() < 2 || clean.length() > 50) {
            throw new IllegalArgumentException("Username must be between 2 and 50 characters.");
        }
        if (!clean.matches("^[a-zA-Z0-9._ -]+$")) {
            throw new IllegalArgumentException("Username can contain letters, numbers, spaces, dots, underscores, and hyphens.");
        }

        if (userAccountRepository.existsByDisplayNameIgnoreCaseAndIdNot(clean, accountId)) {
            throw new UsernameAlreadyExistsException("Username '" + clean + "' is already taken. Please choose another.");
        }

        UserAccount account = userAccountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found."));

        account.setDisplayName(clean);
        userAccountRepository.saveAndFlush(account);

        return new UsernameResponse(clean);
    }

    @Transactional
    public NotificationPreferencesResponse getNotificationPreferences(UUID accountId, AccountRole role) {
        enforceValidRole(role);
        UserAccount account = userAccountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found."));
        UserNotificationPreference pref = userNotificationPreferenceRepository.findByUserAccountId(accountId)
                .orElseGet(() -> userNotificationPreferenceRepository.saveAndFlush(new UserNotificationPreference(account)));
        return NotificationPreferencesResponse.from(pref);
    }

    @Transactional
    public NotificationPreferencesResponse updateNotificationPreferences(UUID accountId,
                                                                         AccountRole role,
                                                                         UpdateNotificationPreferencesRequest request) {
        enforceValidRole(role);
        UserAccount account = userAccountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found."));

        UserNotificationPreference pref = userNotificationPreferenceRepository.findByUserAccountId(accountId)
                .orElseGet(() -> new UserNotificationPreference(account));

        if (request.borrowRequestUpdates() != null) {
            pref.setBorrowRequestUpdates(request.borrowRequestUpdates());
        }
        if (request.loanDueReminders() != null) {
            pref.setLoanDueReminders(request.loanDueReminders());
        }
        if (request.overdueFineAlerts() != null) {
            pref.setOverdueFineAlerts(request.overdueFineAlerts());
        }
        if (request.bookRecommendations() != null) {
            pref.setBookRecommendations(request.bookRecommendations());
        }
        if (request.newBookArrivals() != null) {
            pref.setNewBookArrivals(request.newBookArrivals());
        }
        if (request.wishlistBookAlerts() != null) {
            pref.setWishlistBookAlerts(request.wishlistBookAlerts());
        }
        if (request.departmentBookArrivals() != null) {
            pref.setDepartmentBookArrivals(request.departmentBookArrivals());
        }
        if (request.libraryAnnouncements() != null) {
            pref.setLibraryAnnouncements(request.libraryAnnouncements());
        }

        UserNotificationPreference saved = userNotificationPreferenceRepository.saveAndFlush(pref);
        return NotificationPreferencesResponse.from(saved);
    }

    @Transactional
    public ChangePasswordResponse changePassword(UUID accountId,
                                                 AccountRole role,
                                                 ChangePasswordRequest request,
                                                 HttpServletRequest servletRequest) {
        enforceValidRole(role);
        UserAccount account = userAccountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found."));

        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            throw new InvalidCurrentPasswordException("Current password does not match our records.");
        }

        if (Objects.equals(request.currentPassword(), request.newPassword())) {
            throw new IllegalArgumentException("New password cannot be the same as the current password.");
        }

        account.updatePassword(passwordEncoder.encode(request.newPassword()));
        userAccountRepository.saveAndFlush(account);

        // Invalidate other active sessions if SessionRegistry is configured
        if (sessionRegistry != null) {
            String currentSessionId = (servletRequest != null && servletRequest.getSession(false) != null)
                    ? servletRequest.getSession(false).getId() : null;
            for (Object principal : sessionRegistry.getAllPrincipals()) {
                if (principal instanceof AccountUserDetails ud && ud.getId().equals(accountId)) {
                    for (SessionInformation sessionInfo : sessionRegistry.getAllSessions(principal, false)) {
                        if (currentSessionId == null || !sessionInfo.getSessionId().equals(currentSessionId)) {
                            sessionInfo.expireNow();
                        }
                    }
                }
            }
        }

        return ChangePasswordResponse.success();
    }

    private void enforceValidRole(AccountRole role) {
        if (role != AccountRole.STUDENT && role != AccountRole.FACULTY && role != AccountRole.LIBRARIAN) {
            throw new AccessDeniedException("Access denied: Invalid user role.");
        }
    }
}
