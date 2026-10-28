package com.libtrack.auth;

import java.util.Locale;
import java.util.regex.Pattern;

/** Institutional address conventions for the self-registration prototype. */
public final class InstitutionalEmailPolicy {
    private static final Pattern STUDENT = Pattern.compile("^[A-Za-z]+\\.[0-9]{2}[A-Za-z]{3}[0-9]{4,5}@vitapstudent\\.ac\\.in$");
    private static final Pattern FACULTY = Pattern.compile("^(?=[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]*[A-Za-z])[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@vitap\\.ac\\.in$");

    private InstitutionalEmailPolicy() {}

    public static String normalize(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    public static boolean isValid(RegistrationRole role, String email) {
        if (role == null || email == null || email.length() > 254 || !email.equals(email.strip()) || email.chars().anyMatch(Character::isWhitespace)) return false;
        int separator = email.indexOf('@');
        if (separator < 1 || separator > 64 || separator != email.lastIndexOf('@')) return false;
        String normalized = normalize(email);
        return switch (role) {
            case STUDENT -> STUDENT.matcher(normalized).matches();
            case FACULTY -> FACULTY.matcher(normalized).matches();
        };
    }
}
