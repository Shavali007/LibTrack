package com.libtrack.fines;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Current fine terms used for newly issued loans. Existing loans retain their snapshots. */
public record FinePolicy(BigDecimal dailyRate, BigDecimal maximumFine, int gracePeriodDays, int loanPeriodDays) {
    public static final String DAILY_RATE_KEY = "fine.daily.rate";
    public static final String MAXIMUM_FINE_KEY = "fine.max.limit";
    public static final String GRACE_PERIOD_KEY = "fine.grace.period.days";
    public static final String LOAN_PERIOD_KEY = "loan.period.days";
    public static final int DEFAULT_LOAN_PERIOD_DAYS = 21;
    public static final int MAX_LOAN_PERIOD_DAYS = 3650;
    public static final BigDecimal DEFAULT_DAILY_RATE = new BigDecimal("10.00");
    public static final BigDecimal DEFAULT_MAXIMUM_FINE = new BigDecimal("500.00");
    public static final int DEFAULT_GRACE_PERIOD_DAYS = 0;
    public static final BigDecimal MAX_MONEY_VALUE = new BigDecimal("99999999.99");

    public FinePolicy {
        dailyRate = validateMoney(DAILY_RATE_KEY, dailyRate);
        maximumFine = validateMoney(MAXIMUM_FINE_KEY, maximumFine);
        if (gracePeriodDays < 0) {
            throw new IllegalArgumentException("Fine grace period must be a non-negative whole number of days.");
        }
        if (loanPeriodDays < 1 || loanPeriodDays > MAX_LOAN_PERIOD_DAYS) {
            throw new IllegalArgumentException("Loan period must be a whole number between 1 and 3,650 days.");
        }
    }

    public static FinePolicy fromSettings(String dailyRate, String maximumFine, String gracePeriodDays, String loanPeriodDays) {
        return new FinePolicy(
                parseMoney(DAILY_RATE_KEY, dailyRate),
                parseMoney(MAXIMUM_FINE_KEY, maximumFine),
                parseGracePeriod(gracePeriodDays),
                parseLoanPeriod(loanPeriodDays)
        );
    }

    public static String normalizeSetting(String key, String value) {
        return switch (key) {
            case DAILY_RATE_KEY, MAXIMUM_FINE_KEY -> parseMoney(key, value).toPlainString();
            case GRACE_PERIOD_KEY -> Integer.toString(parseGracePeriod(value));
            case LOAN_PERIOD_KEY -> Integer.toString(parseLoanPeriod(value));
            default -> value;
        };
    }

    public boolean monetaryFinesEnabled() {
        return dailyRate.signum() > 0 && maximumFine.signum() > 0;
    }

    public String dailyRateLabel() { return "₹" + displayMoney(dailyRate); }
    public String maximumFineLabel() { return "₹" + displayMoney(maximumFine); }
    public String gracePeriodLabel() { return gracePeriodDays + (gracePeriodDays == 1 ? " day" : " days"); }

    public String description() {
        if (!monetaryFinesEnabled()) {
            return "Monetary fine assessment is disabled because the configured daily rate or maximum is zero. "
                    + "Any fine terms already recorded on existing loans remain in effect; payment is recorded manually at the circulation desk.";
        }
        return "Overdue loans accrue " + dailyRateLabel() + " per day after a " + gracePeriodLabel()
                + " grace period, capped at " + maximumFineLabel() + " per book. Payments are recorded manually by a Librarian "
                + "at the circulation desk; partial payments are not accepted. Existing loans retain the terms captured when issued.";
    }

    private static BigDecimal parseMoney(String key, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Fine setting " + key + " must be a monetary value with at most two decimal places.");
        }
        try {
            BigDecimal parsed = new BigDecimal(value.trim());
            return validateMoney(key, parsed);
        } catch (NumberFormatException | ArithmeticException exception) {
            throw new IllegalArgumentException("Fine setting " + key + " must be a non-negative monetary value with at most two decimal places and no more than ₹99,999,999.99.");
        }
    }

    private static BigDecimal validateMoney(String key, BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(MAX_MONEY_VALUE) > 0 || value.scale() > 2) {
            throw new IllegalArgumentException("Fine setting " + key + " must be a non-negative monetary value with at most two decimal places and no more than ₹99,999,999.99.");
        }
        return value.setScale(2, RoundingMode.UNNECESSARY);
    }

    private static int parseGracePeriod(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Fine grace period must be a non-negative whole number of days.");
        }
        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed < 0) throw new IllegalArgumentException("Fine grace period must be a non-negative whole number of days.");
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Fine grace period must be a whole number between 0 and 2,147,483,647 days.");
        }
    }

    private static int parseLoanPeriod(String value) {
        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed < 1 || parsed > MAX_LOAN_PERIOD_DAYS) throw new IllegalArgumentException();
            return parsed;
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Loan period must be a whole number between 1 and 3,650 days.");
        }
    }

    private static String displayMoney(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
