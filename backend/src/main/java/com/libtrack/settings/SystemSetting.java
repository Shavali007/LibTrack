package com.libtrack.settings;

import java.time.Instant;
import java.util.Objects;

import com.libtrack.auth.UserAccount;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_setting")
public class SystemSetting {
    @Id
    @Column(name = "setting_key", nullable = false, length = 80)
    private String settingKey;

    @Column(name = "setting_value", nullable = false, length = 255)
    private String settingValue;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_account_id")
    private UserAccount updatedBy;

    protected SystemSetting() {}

    public SystemSetting(String settingKey, String settingValue, Instant updatedAt, UserAccount updatedBy) {
        this.settingKey = Objects.requireNonNull(settingKey, "settingKey must not be null");
        this.settingValue = Objects.requireNonNull(settingValue, "settingValue must not be null");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");
        this.updatedBy = updatedBy;
    }

    public String getSettingKey() { return settingKey; }
    public String getSettingValue() { return settingValue; }
    public Instant getUpdatedAt() { return updatedAt; }
    public UserAccount getUpdatedBy() { return updatedBy; }

    public void update(String newValue, Instant when, UserAccount updater) {
        this.settingValue = Objects.requireNonNull(newValue, "settingValue must not be null");
        this.updatedAt = Objects.requireNonNull(when, "updatedAt must not be null");
        this.updatedBy = updater;
    }
}
