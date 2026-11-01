package com.libtrack.librarian;

import java.time.Instant;
import java.util.UUID;

public record MemberApprovalAuditItem(
        UUID id,
        String decision,
        UUID reviewedByAccountId,
        String reviewerName,
        Instant reviewedAt,
        String rejectionReason,
        String remarks
) {}
