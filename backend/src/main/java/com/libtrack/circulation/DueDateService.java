package com.libtrack.circulation;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
@Service
public class DueDateService {
 public static final int LOAN_CALENDAR_DAYS=30;
 private static final int MAX_CONSECUTIVE_CONFIGURED_HOLIDAYS=3660;
 private final LibraryHolidayRepository holidays;
 public DueDateService(LibraryHolidayRepository holidays){this.holidays=holidays;}
 public LocalDate initialDueDate(LocalDate issueDate){return adjust(issueDate.plusDays(LOAN_CALENDAR_DAYS));}
 public LocalDate renewalDueDate(LocalDate previousDueDate){return adjust(previousDueDate.plusDays(LOAN_CALENDAR_DAYS));}
 public LocalDate adjust(LocalDate candidate){LocalDate due=candidate;int shifted=0;while(holidays.existsByHolidayDate(due)){if(++shifted>MAX_CONSECUTIVE_CONFIGURED_HOLIDAYS)throw new LibraryCalendarConfigurationException();due=due.plusDays(1);}return due;}
}
