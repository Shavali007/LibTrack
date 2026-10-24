package com.libtrack.auth;

public final class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException() {
        super("Account not found.");
    }
}
