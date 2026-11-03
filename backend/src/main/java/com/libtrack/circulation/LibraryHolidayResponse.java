package com.libtrack.circulation;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record LibraryHolidayResponse(
    UUID id,
    LocalDate fromDate,
    LocalDate toDate,
    long durationDays,
    String name,
    String createdByEmail,
    Instant createdAt,
    LocalDate holidayDate
) {
    public static LibraryHolidayResponse from(LibraryHoliday holiday) {
        long duration = ChronoUnit.DAYS.between(holiday.getFromDate(), holiday.getToDate()) + 1;
        return new LibraryHolidayResponse(
            holiday.getId(),
            holiday.getFromDate(),
            holiday.getToDate(),
            duration,
            holiday.getName(),
            holiday.getCreatedBy() != null ? holiday.getCreatedBy().getEmail() : null,
            holiday.getCreatedAt(),
            holiday.getFromDate()
        );
    }
}
