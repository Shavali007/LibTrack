package com.libtrack.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.notifications.NotificationPreferencesResponse;
import com.libtrack.notifications.UpdateNotificationPreferencesRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users/me")
@PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    public UserSettingsController(UserSettingsService userSettingsService) {
        this.userSettingsService = userSettingsService;
    }

    private static AccountUserDetails userDetails(Authentication authentication) {
        return (AccountUserDetails) authentication.getPrincipal();
    }

    @GetMapping("/settings")
    public ResponseEntity<UserSettingsResponse> getSettings(Authentication authentication) {
        AccountUserDetails user = userDetails(authentication);
        return ResponseEntity.ok(userSettingsService.getUserSettings(user.getId(), user.getRole()));
    }

    @PutMapping("/username")
    public ResponseEntity<UsernameResponse> updateUsername(
            @Valid @RequestBody UpdateUsernameRequest request,
            Authentication authentication) {
        AccountUserDetails user = userDetails(authentication);
        return ResponseEntity.ok(userSettingsService.updateUsername(user.getId(), user.getRole(), request.cleanUsername()));
    }

    @GetMapping({"/notifications", "/notifications/preferences"})
    public ResponseEntity<NotificationPreferencesResponse> getNotificationPreferences(Authentication authentication) {
        AccountUserDetails user = userDetails(authentication);
        return ResponseEntity.ok(userSettingsService.getNotificationPreferences(user.getId(), user.getRole()));
    }

    @PutMapping({"/notifications", "/notifications/preferences"})
    public ResponseEntity<NotificationPreferencesResponse> updateNotificationPreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request,
            Authentication authentication) {
        AccountUserDetails user = userDetails(authentication);
        return ResponseEntity.ok(userSettingsService.updateNotificationPreferences(user.getId(), user.getRole(), request));
    }

    @PutMapping("/password")
    public ResponseEntity<ChangePasswordResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        AccountUserDetails user = userDetails(authentication);
        return ResponseEntity.ok(userSettingsService.changePassword(user.getId(), user.getRole(), request, servletRequest));
    }
}
