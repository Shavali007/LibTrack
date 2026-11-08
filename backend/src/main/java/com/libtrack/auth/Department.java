package com.libtrack.auth;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public enum Department {
    COMPUTER_SCIENCE_AND_ENGINEERING("Computer Science and Engineering", "CSE"),
    ELECTRONICS_AND_COMMUNICATION_ENGINEERING("Electronics and Communication Engineering", "ECE"),
    ELECTRICAL_AND_ELECTRONICS_ENGINEERING("Electrical and Electronics Engineering", "EEE"),
    MECHANICAL_ENGINEERING("Mechanical Engineering", "ME");

    private final String canonicalName;
    private final String code;

    Department(String canonicalName, String code) {
        this.canonicalName = canonicalName;
        this.code = code;
    }

    public String getCanonicalName() {
        return canonicalName;
    }

    public String getCode() {
        return code;
    }

    public static List<String> canonicalNames() {
        return Arrays.stream(values())
                .map(Department::getCanonicalName)
                .toList();
    }

    public static Optional<Department> fromString(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        String clean = text.trim();
        for (Department dept : values()) {
            if (dept.name().equalsIgnoreCase(clean)
                    || dept.canonicalName.equalsIgnoreCase(clean)
                    || dept.code.equalsIgnoreCase(clean)
                    || (dept.canonicalName + " (" + dept.code + ")").equalsIgnoreCase(clean)) {
                return Optional.of(dept);
            }
        }
        if ("Computer Science".equalsIgnoreCase(clean) || "Computer Science & Engineering".equalsIgnoreCase(clean)) {
            return Optional.of(COMPUTER_SCIENCE_AND_ENGINEERING);
        }
        if ("Electronics & Communication Engineering".equalsIgnoreCase(clean) || "Electronics and Communication".equalsIgnoreCase(clean)) {
            return Optional.of(ELECTRONICS_AND_COMMUNICATION_ENGINEERING);
        }
        if ("Electrical & Electronics Engineering".equalsIgnoreCase(clean) || "Electrical and Electronics".equalsIgnoreCase(clean)) {
            return Optional.of(ELECTRICAL_AND_ELECTRONICS_ENGINEERING);
        }
        if ("Mechanical".equalsIgnoreCase(clean)) {
            return Optional.of(MECHANICAL_ENGINEERING);
        }
        return Optional.empty();
    }

    public static boolean isValid(String text) {
        return fromString(text).isPresent();
    }

    public static String canonicalize(String text) {
        return fromString(text)
                .map(Department::getCanonicalName)
                .orElse(null);
    }
}
