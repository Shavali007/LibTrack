package com.libtrack.catalogue;

import java.util.Locale;

public final class IsbnValidator {
    private IsbnValidator() {}
    public static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
    }
    public static boolean isValid(String value) {
        if (value == null || value.isBlank()) return true;
        String isbn = normalize(value);
        if (isbn.length() == 10) {
            int sum = 0;
            for (int i = 0; i < 10; i++) {
                int digit = i == 9 && isbn.charAt(i) == 'X' ? 10 : Character.digit(isbn.charAt(i), 10);
                if (digit < 0) return false;
                sum += (10 - i) * digit;
            }
            return sum % 11 == 0;
        }
        if (isbn.length() == 13) {
            int sum = 0;
            for (int i = 0; i < 13; i++) {
                int digit = Character.digit(isbn.charAt(i), 10);
                if (digit < 0) return false;
                sum += digit * (i % 2 == 0 ? 1 : 3);
            }
            return sum % 10 == 0;
        }
        return false;
    }
}
