package com.libtrack.settings;

import java.time.Instant;

public record SettingRecord(
    String key,
    String value,
    Instant updatedAt,
    String updatedByEmail
) {}
