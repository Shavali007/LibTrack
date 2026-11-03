package com.libtrack.circulation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record LibraryHolidayInput(
    LocalDate fromDate,
    LocalDate toDate,
    @NotBlank @Size(max = 160) String name,
    LocalDate holidayDate
) {
    public LibraryHolidayInput(LocalDate holidayDate, String name) {
        this(holidayDate, holidayDate, name, holidayDate);
    }

    public LibraryHolidayInput(LocalDate fromDate, LocalDate toDate, String name) {
        this(fromDate, toDate, name, fromDate);
    }

    public LocalDate resolveFromDate() {
        if (fromDate != null) {
            return fromDate;
        }
        return holidayDate;
    }

    public LocalDate resolveToDate() {
        if (toDate != null) {
            return toDate;
        }
        if (fromDate != null) {
            return fromDate;
        }
        return holidayDate;
    }
}
