package com.libtrack.fines;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.settings.SystemSettingService;

@Service
public class FinePolicyService {
    private final SystemSettingService settings;

    public FinePolicyService(SystemSettingService settings) {
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public FinePolicy currentPolicy() {
        return FinePolicy.fromSettings(
                settings.getSetting(FinePolicy.DAILY_RATE_KEY, FinePolicy.DEFAULT_DAILY_RATE.toPlainString()),
                settings.getSetting(FinePolicy.MAXIMUM_FINE_KEY, FinePolicy.DEFAULT_MAXIMUM_FINE.toPlainString()),
                settings.getSetting(FinePolicy.GRACE_PERIOD_KEY, Integer.toString(FinePolicy.DEFAULT_GRACE_PERIOD_DAYS)),
                settings.getSetting(FinePolicy.LOAN_PERIOD_KEY, Integer.toString(FinePolicy.DEFAULT_LOAN_PERIOD_DAYS))
        );
    }

    @Transactional(readOnly = true)
    public boolean isConfigured() {
        return settings.hasSetting(FinePolicy.DAILY_RATE_KEY)
                && settings.hasSetting(FinePolicy.MAXIMUM_FINE_KEY)
                && settings.hasSetting(FinePolicy.GRACE_PERIOD_KEY)
                && settings.hasSetting(FinePolicy.LOAN_PERIOD_KEY);
    }
}
