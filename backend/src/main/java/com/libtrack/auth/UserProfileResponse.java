package com.libtrack.auth;

import java.util.UUID;

public record UserProfileResponse(UUID id, String email, AccountRole role, String displayName) {

    public UserProfileResponse(UUID id, String email, AccountRole role) {
        this(id, email, role, null);
    }

    public static UserProfileResponse from(AccountUserDetails user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getRole(), user.getDisplayName());
    }
}
