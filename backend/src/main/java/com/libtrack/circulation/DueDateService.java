package com.libtrack.circulation;

import java.time.DayOfWeek;
import java.time.LocalDate;
import org.springframework.stereotype.Service;


@Service
public class DueDateService {
    public static final int DEFAULT_LOAN_PERIOD_DAYS = 21;
    public static final int STANDARD_LOAN_DAYS = 21;
    public static final int RENEWAL_EXTENSION_DAYS = 21;
    public static final int LOAN_CALENDAR_DAYS = 21;
    private static final int MAX_SEARCH_DAYS = 3660;

    private final LibraryHolidayRepository holidays;

    public DueDateService(LibraryHolidayRepository holidays) {
        this.holidays = holidays;
    }

    public LocalDate initialDueDate(LocalDate issueDate) {
        return calculateDueDate(issueDate, DEFAULT_LOAN_PERIOD_DAYS);
    }

    public LocalDate initialDueDate(LocalDate issueDate, int eligibleDays) {
        return calculateDueDate(issueDate, eligibleDays);
    }

    public LocalDate renewalDueDate(LocalDate previousDueDate) {
        return calculateDueDate(previousDueDate, RENEWAL_EXTENSION_DAYS);
    }

    /**
     * Centralized due date calculation:
     * 1. Adds durationDays to baseDate to obtain the normal due date.
     *    Holidays/Sundays/Mondays occurring during the borrowing period do NOT extend the loan.
     * 2. Checks if the normal due date falls on Sunday, Monday, or a library holiday range.
     * 3. Extends by exactly 1 calendar day iteratively until the date is not Sunday,
     *    not Monday, and not within a configured holiday range.
     *    Tuesday through Saturday are valid due dates unless configured as holidays.
     */
    public LocalDate calculateDueDate(LocalDate baseDate, int durationDays) {
        if (durationDays < 0) {
            durationDays = 0;
        }
        LocalDate normalDueDate = baseDate.plusDays(durationDays);
        return adjustDueDate(normalDueDate);
    }

    /**
     * Adjusts a candidate due date according to non-working day rules.
     */
    public LocalDate adjustDueDate(LocalDate candidate) {
        LocalDate current = candidate;
        int shifted = 0;
        while (isNonWorkingDay(current)) {
            if (++shifted > MAX_SEARCH_DAYS) {
                throw new LibraryCalendarConfigurationException();
            }
            current = current.plusDays(1);
        }
        return current;
    }

    public boolean isNonWorkingDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SUNDAY || dow == DayOfWeek.MONDAY) {
            return true;
        }
        return isLibraryHoliday(date);
    }

    public boolean isLibraryHoliday(LocalDate date) {
        return holidays.isLibraryHoliday(date);
    }

    public LocalDate adjust(LocalDate candidate) {
        return adjustDueDate(candidate);
    }
}
