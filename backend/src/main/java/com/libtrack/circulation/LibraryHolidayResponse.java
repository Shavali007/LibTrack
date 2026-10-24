package com.libtrack.circulation;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
public record LibraryHolidayResponse(UUID id,LocalDate holidayDate,String name,String createdByEmail,Instant createdAt){}
