package com.libtrack.settings;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@Service
public class SystemSettingService {
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

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public SettingRecord updateSetting(String key, String value, UUID librarianId) {
        UserAccount librarian = accountRepository.findById(librarianId)
                .orElseThrow(() -> new IllegalArgumentException("Librarian account not found"));

        Instant now = Instant.now(clock);
        SystemSetting setting = settingRepository.findById(key)
                .orElseGet(() -> new SystemSetting(key, value.trim(), now, librarian));

        setting.update(value.trim(), now, librarian);
        setting = settingRepository.save(setting);
        return toRecord(setting);
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
