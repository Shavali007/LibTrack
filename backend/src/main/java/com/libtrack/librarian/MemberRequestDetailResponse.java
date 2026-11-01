package com.libtrack.librarian;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;

public record MemberRequestDetailResponse(
        UUID id,
        String fullName,
        String institutionalId,
        String email,
        AccountRole role,
        ApprovalStatus approvalStatus,
        Instant requestedOn,
        Instant reviewedAt,
        UUID reviewedByAccountId,
        String reviewedByLibrarianName,
        String rejectionReason,
        String librarianRemarks,
        List<MemberApprovalAuditItem> auditHistory
) {}
