package com.libtrack.circulation;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
public record LoanEventResponse(LoanEventType eventType,String actorEmail,Instant occurredAt,LocalDate effectiveDate,LocalDate previousDueDate,LocalDate newDueDate,String copyStatus,String note){}
