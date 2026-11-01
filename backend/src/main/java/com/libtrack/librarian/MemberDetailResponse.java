package com.libtrack.librarian;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.libtrack.auth.AccountRole;
import com.libtrack.circulation.BorrowRequestResponse;
import com.libtrack.circulation.LoanResponse;

public record MemberDetailResponse(
    UUID id,
    String email,
    AccountRole role,
    boolean enabled,
    String institutionalId,
    Instant createdAt,
    Instant identityVerifiedAt,
    List<LoanResponse> currentLoans,
    List<LoanResponse> borrowingHistory,
    List<BorrowRequestResponse> borrowRequests,
    String displayName
) {
    public MemberDetailResponse(UUID id, String email, AccountRole role, boolean enabled,
                                String institutionalId, Instant createdAt, Instant identityVerifiedAt,
                                List<LoanResponse> currentLoans, List<LoanResponse> borrowingHistory,
                                List<BorrowRequestResponse> borrowRequests) {
        this(id, email, role, enabled, institutionalId, createdAt, identityVerifiedAt,
             currentLoans, borrowingHistory, borrowRequests, null);
    }
}
