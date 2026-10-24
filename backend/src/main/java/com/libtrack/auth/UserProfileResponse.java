package com.libtrack.auth;

import java.util.UUID;

public record UserProfileResponse(UUID id, String email, AccountRole role) {
    static UserProfileResponse from(AccountUserDetails user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getRole());
    }
}
