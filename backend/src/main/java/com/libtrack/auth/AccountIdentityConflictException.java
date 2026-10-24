package com.libtrack.auth;

public final class AccountIdentityConflictException extends RuntimeException {
    public AccountIdentityConflictException() {
        super("An account with that email or institutional identity already exists.");
    }
}
