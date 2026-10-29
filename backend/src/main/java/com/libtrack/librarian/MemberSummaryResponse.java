package com.libtrack.librarian;

import java.time.Instant;
import java.util.UUID;
import com.libtrack.auth.AccountRole;

public record MemberSummaryResponse(
    UUID id,
    String email,
    AccountRole role,
    boolean enabled,
    String institutionalId,
    Instant createdAt,
    long currentLoans
) {}
