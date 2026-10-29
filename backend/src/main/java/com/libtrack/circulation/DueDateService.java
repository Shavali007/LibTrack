package com.libtrack.circulation;

import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class DueDateService {
    public static final int STANDARD_LOAN_DAYS = 21;
    public static final int RENEWAL_EXTENSION_DAYS = 21;
    public static final int LOAN_CALENDAR_DAYS = 21;
    private static final int MAX_SEARCH_DAYS = 3660;

    private final LibraryHolidayRepository holidays;

    public DueDateService(LibraryHolidayRepository holidays) {
        this.holidays = holidays;
    }

    public LocalDate initialDueDate(LocalDate issueDate) {
        return calculateDueDate(issueDate, STANDARD_LOAN_DAYS);
    }

    public LocalDate renewalDueDate(LocalDate previousDueDate) {
        return calculateDueDate(previousDueDate, RENEWAL_EXTENSION_DAYS);
    }

    public LocalDate calculateDueDate(LocalDate baseDate, int eligibleDays) {
        if (eligibleDays <= 0) {
            return baseDate;
        }
        LocalDate current = baseDate;
        int counted = 0;
        int safetyLimit = 0;
        while (counted < eligibleDays) {
            current = current.plusDays(1);
            if (++safetyLimit > MAX_SEARCH_DAYS) {
                throw new LibraryCalendarConfigurationException();
            }
            if (!holidays.existsByHolidayDate(current)) {
                counted++;
            }
        }
        return current;
    }

    public LocalDate adjust(LocalDate candidate) {
        LocalDate due = candidate;
        int shifted = 0;
        while (holidays.existsByHolidayDate(due)) {
            if (++shifted > MAX_SEARCH_DAYS) {
                throw new LibraryCalendarConfigurationException();
            }
            due = due.plusDays(1);
        }
        return due;
    }
}
