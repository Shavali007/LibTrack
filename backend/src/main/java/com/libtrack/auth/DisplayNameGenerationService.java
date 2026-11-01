package com.libtrack.auth;

import java.util.Locale;
import org.springframework.stereotype.Service;

/**
 * Reusable service for extracting and formatting user display names from email addresses.
 */
@Service
public class DisplayNameGenerationService {

    /**
     * Extracts and capitalizes the display name from an email address.
     * Logic:
     * 1. Extract the portion before '@'.
     * 2. Split it at the first period ('.').
     * 3. Take the first segment.
     * 4. Capitalize its first letter.
     * 5. Convert the remaining letters to lowercase.
     *
     * Handles null, empty, malformed, and single-segment formats safely.
     */
    public String generateDisplayName(String email) {
        if (email == null) {
            return "Member";
        }
        String clean = email.strip();
        if (clean.isEmpty()) {
            return "Member";
        }

        int atIndex = clean.indexOf('@');
        String username;
        if (atIndex > 0) {
            username = clean.substring(0, atIndex);
        } else if (atIndex == 0) {
            return "Member";
        } else {
            username = clean;
        }

        int dotIndex = username.indexOf('.');
        String segment = (dotIndex >= 0) ? username.substring(0, dotIndex) : username;
        segment = segment.strip();

        if (segment.isEmpty()) {
            return "Member";
        }

        if (segment.length() == 1) {
            return segment.toUpperCase(Locale.ROOT);
        }
        return segment.substring(0, 1).toUpperCase(Locale.ROOT)
                + segment.substring(1).toLowerCase(Locale.ROOT);
    }
}
