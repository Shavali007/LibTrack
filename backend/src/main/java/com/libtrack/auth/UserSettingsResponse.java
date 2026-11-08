package com.libtrack.auth;

import java.util.UUID;
import com.libtrack.notifications.NotificationPreferencesResponse;

public record UserSettingsResponse(
        UUID id,
        String displayName,
        String username,
        String fullName,
        String email,
        String institutionalId,
        String department,
        String designation,
        AccountRole role,
        NotificationPreferencesResponse notificationPreferences
) {}
