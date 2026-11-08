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
    long currentLoans,
    String displayName,
    String department
) {
    public MemberSummaryResponse(UUID id, String email, AccountRole role, boolean enabled,
                                 String institutionalId, Instant createdAt, long currentLoans, String displayName) {
        this(id, email, role, enabled, institutionalId, createdAt, currentLoans, displayName, null);
    }

    public MemberSummaryResponse(UUID id, String email, AccountRole role, boolean enabled,
                                 String institutionalId, Instant createdAt, long currentLoans) {
        this(id, email, role, enabled, institutionalId, createdAt, currentLoans, null, null);
    }
}
