package com.libtrack.auth;

public record ChangePasswordResponse(String status, String message) {
    public static ChangePasswordResponse success() {
        return new ChangePasswordResponse("SUCCESS", "Password updated successfully.");
    }
}
