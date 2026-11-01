package com.libtrack.auth;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class AccountUserDetails implements UserDetails {
    private final UUID id;
    private final String email;
    private final String passwordHash;
    private final AccountRole role;
    private final boolean enabled;
    private final String displayName;

    public AccountUserDetails(UserAccount account) {
        id = account.getId();
        email = account.getEmail();
        passwordHash = account.getPasswordHash();
        role = account.getRole();
        enabled = account.isEnabled() && account.getApprovalStatus() == ApprovalStatus.APPROVED;
        displayName = account.getDisplayName();
    }

    public UUID getId() { return id; }
    public AccountRole getRole() { return role; }
    public String getDisplayName() { return displayName; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return enabled; }
}
