package com.libtrack.circulation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
public record LibraryHolidayInput(@NotNull LocalDate holidayDate,@NotBlank @Size(max=160) String name){}
