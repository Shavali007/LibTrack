package com.libtrack.settings;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@Service
public class SystemSettingService {
    private static final Set<String> POSITIVE_INTEGER_KEYS = Set.of(
            "loan.period.student.days",
            "loan.period.faculty.days",
            "loan.renewal.limit",
            "loan.renewal.extension.days",
            "loan.max.active.student",
            "loan.max.active.faculty"
    );

    private final SystemSettingRepository settingRepository;
    private final UserAccountRepository accountRepository;
    private final Clock clock;

    public SystemSettingService(SystemSettingRepository settingRepository,
                                UserAccountRepository accountRepository,
                                Clock clock) {
        this.settingRepository = settingRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<SettingRecord> getAllSettings() {
        return settingRepository.findAllWithUpdater()
                .stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public String getSetting(String key, String defaultValue) {
        return settingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public LibraryInfoRecord getLibraryInfo() {
        return new LibraryInfoRecord(
                getSetting("library.name", "VIT-AP Central Library"),
                getSetting("library.contact_email", "library@vitap.ac.in"),
                getSetting("library.contact_phone", "+91 86323 45678"),
                getSetting("library.address", "VIT-AP University, Inavolu, Guntur - 522237"),
                getSetting("library.operating_hours_open", "09:00 AM"),
                getSetting("library.operating_hours_close", "06:00 PM")
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public LibraryInfoRecord updateLibraryInfo(LibraryInfoRecord input, UUID librarianId) {
        updateSetting("library.name", input.libraryName(), librarianId);
        updateSetting("library.contact_email", input.contactEmail(), librarianId);
        updateSetting("library.contact_phone", input.contactPhone(), librarianId);
        updateSetting("library.address", input.address(), librarianId);
        updateSetting("library.operating_hours_open", input.openTime(), librarianId);
        updateSetting("library.operating_hours_close", input.closeTime(), librarianId);
        return getLibraryInfo();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public SettingRecord updateSetting(String key, String value, UUID librarianId) {
        UserAccount librarian = accountRepository.findById(librarianId)
                .orElseThrow(() -> new IllegalArgumentException("Librarian account not found"));

        validateSettingValue(key, value);

        Instant now = Instant.now(clock);
        SystemSetting setting = settingRepository.findById(key)
                .orElseGet(() -> new SystemSetting(key, value.trim(), now, librarian));

        setting.update(value.trim(), now, librarian);
        setting = settingRepository.save(setting);
        return toRecord(setting);
    }

    private void validateSettingValue(String key, String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Setting value cannot be blank");
        }
        String trimmed = value.trim();
        if (POSITIVE_INTEGER_KEYS.contains(key)) {
            try {
                int parsed = Integer.parseInt(trimmed);
                if (parsed <= 0) {
                    throw new IllegalArgumentException("Setting " + key + " must be a positive whole number greater than zero.");
                }
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Setting " + key + " must be a valid positive whole number.");
            }
        } else if ("fine.grace.period.days".equals(key)) {
            try {
                int parsed = Integer.parseInt(trimmed);
                if (parsed < 0) {
                    throw new IllegalArgumentException("Grace period cannot be negative.");
                }
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Grace period must be an integer.");
            }
        }
    }

    private SettingRecord toRecord(SystemSetting s) {
        return new SettingRecord(
                s.getSettingKey(),
                s.getSettingValue(),
                s.getUpdatedAt(),
                s.getUpdatedBy() != null ? s.getUpdatedBy().getEmail() : null
        );
    }
}
