package com.libtrack.circulation;

import java.time.LocalDate;
import java.util.UUID;

public record LostDamagedCopyItem(
    UUID copyId,
    UUID bookId,
    String bookTitle,
    String coverImageUrl,
    String copyIdentifier,
    String location,
    String status,
    String condition,
    String borrowerName,
    String borrowerEmail,
    String borrowerRole,
    LocalDate reportedDate,
    String caseNote
) {}
