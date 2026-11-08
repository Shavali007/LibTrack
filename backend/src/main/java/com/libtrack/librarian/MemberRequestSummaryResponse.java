package com.libtrack.librarian;

import java.time.Instant;
import java.util.UUID;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;

public record MemberRequestSummaryResponse(
        UUID id,
        String fullName,
        String email,
        String institutionalId,
        AccountRole role,
        Instant requestedOn,
        ApprovalStatus approvalStatus,
        Instant reviewedAt,
        String reviewedByLibrarianName,
        String rejectionReason,
        String librarianRemarks,
        String department
) {
    public MemberRequestSummaryResponse(
            UUID id,
            String fullName,
            String email,
            String institutionalId,
            AccountRole role,
            Instant requestedOn,
            ApprovalStatus approvalStatus,
            Instant reviewedAt,
            String reviewedByLibrarianName,
            String rejectionReason,
            String librarianRemarks
    ) {
        this(id, fullName, email, institutionalId, role, requestedOn, approvalStatus, reviewedAt, reviewedByLibrarianName, rejectionReason, librarianRemarks, null);
    }
}
