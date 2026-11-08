package com.libtrack.librarian;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.AccountNotFoundException;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.PageResponse;
import com.libtrack.notifications.NotificationService;

@Service
public class MemberApprovalService {
    private static final int MAX_PAGE_SIZE = 100;

    private final UserAccountRepository accounts;
    private final MemberApprovalAuditRepository auditRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public MemberApprovalService(UserAccountRepository accounts,
                                 MemberApprovalAuditRepository auditRepository,
                                 NotificationService notificationService,
                                 Clock clock) {
        this.accounts = accounts;
        this.auditRepository = auditRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public MemberRequestCountsResponse getCounts() {
        long pending = accounts.countByApprovalStatusForMembers(ApprovalStatus.PENDING_APPROVAL);
        long approved = accounts.countByApprovalStatusForMembers(ApprovalStatus.APPROVED);
        long rejected = accounts.countByApprovalStatusForMembers(ApprovalStatus.REJECTED);
        return new MemberRequestCountsResponse(pending, approved, rejected);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public PageResponse<MemberRequestSummaryResponse> listRequests(ApprovalStatus status, AccountRole role, String q, int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must be zero or greater.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and 100.");
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        Page<UserAccount> result = accounts.findAll(
                MemberRequestSpecifications.requests(status, role, q),
                PageRequest.of(page, size, sort)
        );

        Set<UUID> reviewerIds = result.getContent().stream()
                .map(UserAccount::getReviewedByAccountId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> reviewerNames = accounts.findAllById(reviewerIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail()));

        List<MemberRequestSummaryResponse> content = result.getContent().stream().map(a ->
                new MemberRequestSummaryResponse(
                        a.getId(),
                        a.getDisplayName() != null ? a.getDisplayName() : a.getEmail(),
                        a.getEmail(),
                        a.getInstitutionalId(),
                        a.getRole(),
                        a.getCreatedAt(),
                        a.getApprovalStatus(),
                        a.getReviewedAt(),
                        a.getReviewedByAccountId() != null ? reviewerNames.get(a.getReviewedByAccountId()) : null,
                        a.getRejectionReason(),
                        a.getLibrarianRemarks(),
                        a.getDepartment()
                )
        ).toList();

        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public MemberRequestDetailResponse getRequestDetails(UUID requestId) {
        UserAccount account = accounts.findById(requestId).orElseThrow(AccountNotFoundException::new);
        if (account.getRole() != AccountRole.STUDENT && account.getRole() != AccountRole.FACULTY) {
            throw new IllegalArgumentException("Only Student and Faculty registration requests can be reviewed.");
        }

        String reviewerName = null;
        if (account.getReviewedByAccountId() != null) {
            reviewerName = accounts.findById(account.getReviewedByAccountId())
                    .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                    .orElse(null);
        }

        List<MemberApprovalAudit> audits = auditRepository.findByAccountIdOrderByReviewedAtDesc(requestId);
        Set<UUID> auditReviewerIds = audits.stream()
                .map(MemberApprovalAudit::getReviewedByAccountId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> auditReviewerNames = accounts.findAllById(auditReviewerIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail()));

        List<MemberApprovalAuditItem> auditItems = audits.stream().map(aud ->
                new MemberApprovalAuditItem(
                        aud.getId(),
                        aud.getDecision(),
                        aud.getReviewedByAccountId(),
                        aud.getReviewedByAccountId() != null ? auditReviewerNames.get(aud.getReviewedByAccountId()) : null,
                        aud.getReviewedAt(),
                        aud.getRejectionReason(),
                        aud.getRemarks()
                )
        ).toList();

        return new MemberRequestDetailResponse(
                account.getId(),
                account.getDisplayName() != null ? account.getDisplayName() : account.getEmail(),
                account.getInstitutionalId(),
                account.getEmail(),
                account.getRole(),
                account.getApprovalStatus(),
                account.getCreatedAt(),
                account.getReviewedAt(),
                account.getReviewedByAccountId(),
                reviewerName,
                account.getRejectionReason(),
                account.getLibrarianRemarks(),
                auditItems,
                account.getDepartment()
        );
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public MemberRequestDetailResponse approveRequest(UUID requestId, UUID librarianId, ApproveMemberRequest request) {
        UserAccount account = accounts.findByIdForUpdate(requestId).orElseThrow(AccountNotFoundException::new);
        if (account.getRole() != AccountRole.STUDENT && account.getRole() != AccountRole.FACULTY) {
            throw new IllegalArgumentException("Only Student and Faculty registration requests can be approved.");
        }
        if (account.getApprovalStatus() != ApprovalStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending registration requests can be approved.");
        }

        Instant now = Instant.now(clock);
        String remarks = request != null ? request.remarks() : null;
        account.approve(librarianId, remarks, now);
        accounts.saveAndFlush(account);

        MemberApprovalAudit audit = new MemberApprovalAudit(
                account.getId(),
                "APPROVED",
                librarianId,
                now,
                null,
                remarks
        );
        auditRepository.saveAndFlush(audit);

        notificationService.sendMemberNotification(
                account.getId(),
                "Account Approved",
                "Your LibTrack membership has been approved.",
                "Welcome to LibTrack! Your membership has been approved. You can now browse the catalogue and borrow books.",
                "MEMBER",
                "MEMBER_REQUEST",
                account.getId(),
                "/workspace",
                null
        );

        return getRequestDetails(requestId);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public MemberRequestDetailResponse rejectRequest(UUID requestId, UUID librarianId, RejectMemberRequest request) {
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException("A rejection reason is required.");
        }

        UserAccount account = accounts.findByIdForUpdate(requestId).orElseThrow(AccountNotFoundException::new);
        if (account.getRole() != AccountRole.STUDENT && account.getRole() != AccountRole.FACULTY) {
            throw new IllegalArgumentException("Only Student and Faculty registration requests can be rejected.");
        }
        if (account.getApprovalStatus() != ApprovalStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending registration requests can be rejected.");
        }

        Instant now = Instant.now(clock);
        String remarks = request.remarks();
        account.reject(librarianId, request.reason(), remarks, now);
        accounts.saveAndFlush(account);

        MemberApprovalAudit audit = new MemberApprovalAudit(
                account.getId(),
                "REJECTED",
                librarianId,
                now,
                request.reason(),
                remarks
        );
        auditRepository.saveAndFlush(audit);

        notificationService.sendMemberNotification(
                account.getId(),
                "Registration Rejected",
                "Your LibTrack registration request was not approved.",
                "Reason: " + request.reason(),
                "MEMBER",
                "MEMBER_REQUEST",
                account.getId(),
                "/login",
                null
        );

        return getRequestDetails(requestId);
    }
}
