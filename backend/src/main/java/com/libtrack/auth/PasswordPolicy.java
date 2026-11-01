package com.libtrack.auth;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

public final class PasswordPolicy {
    private static final Pattern UPPERCASE = Pattern.compile(".*[A-Z].*", Pattern.DOTALL);
    private static final Pattern LOWERCASE = Pattern.compile(".*[a-z].*", Pattern.DOTALL);
    private static final Pattern DIGIT = Pattern.compile(".*[0-9].*", Pattern.DOTALL);
    private static final Pattern SPECIAL = Pattern.compile(".*[^A-Za-z0-9].*", Pattern.DOTALL);

    private PasswordPolicy() {}

    public static boolean satisfies(String password) {
        if (password == null || password.codePointCount(0, password.length()) < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return false;
        }
        return UPPERCASE.matcher(password).matches()
                && LOWERCASE.matcher(password).matches()
                && DIGIT.matcher(password).matches()
                && SPECIAL.matcher(password).matches();
    }
}
