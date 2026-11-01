package com.libtrack.auth;

public final class EmailAlreadyExistsException extends RuntimeException {
    private final ApprovalStatus existingStatus;

    public EmailAlreadyExistsException(ApprovalStatus existingStatus) {
        super("An account with this email already exists.");
        this.existingStatus = existingStatus;
    }

    public ApprovalStatus getExistingStatus() {
        return existingStatus;
    }
}
