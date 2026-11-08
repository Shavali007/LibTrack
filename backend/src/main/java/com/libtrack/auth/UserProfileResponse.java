package com.libtrack.auth;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        AccountRole role,
        String displayName,
        String department,
        String institutionalId) {

    public UserProfileResponse(UUID id, String email, AccountRole role, String displayName, String department) {
        this(id, email, role, displayName, department, null);
    }

    public UserProfileResponse(UUID id, String email, AccountRole role, String displayName) {
        this(id, email, role, displayName, null, null);
    }

    public UserProfileResponse(UUID id, String email, AccountRole role) {
        this(id, email, role, null, null, null);
    }

    public static UserProfileResponse from(AccountUserDetails user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getRole(), user.getDisplayName(), user.getDepartment(), user.getInstitutionalId());
    }

    public static UserProfileResponse from(UserAccount account) {
        return new UserProfileResponse(account.getId(), account.getEmail(), account.getRole(), account.getDisplayName(), account.getDepartment(), account.getInstitutionalId());
    }
}
