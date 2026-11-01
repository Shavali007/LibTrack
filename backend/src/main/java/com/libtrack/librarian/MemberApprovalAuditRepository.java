package com.libtrack.librarian;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberApprovalAuditRepository extends JpaRepository<MemberApprovalAudit, UUID> {
    List<MemberApprovalAudit> findByAccountIdOrderByReviewedAtDesc(UUID accountId);
}
