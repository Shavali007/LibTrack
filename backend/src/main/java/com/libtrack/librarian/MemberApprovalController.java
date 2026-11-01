package com.libtrack.librarian;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountNotFoundException;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.ApprovalStatus;
import com.libtrack.catalogue.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/librarian/member-requests")
@Validated
@PreAuthorize("hasRole('LIBRARIAN')")
public class MemberApprovalController {

    private final MemberApprovalService approvalService;

    public MemberApprovalController(MemberApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @GetMapping("/counts")
    public ResponseEntity<MemberRequestCountsResponse> getCounts() {
        return ResponseEntity.ok(approvalService.getCounts());
    }

    @GetMapping
    public PageResponse<MemberRequestSummaryResponse> listRequests(
            @RequestParam(required = false) ApprovalStatus status,
            @RequestParam(required = false) AccountRole role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return approvalService.listRequests(status, role, q, page, size);
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<MemberRequestDetailResponse> getRequestDetails(@PathVariable UUID requestId) {
        return ResponseEntity.ok(approvalService.getRequestDetails(requestId));
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<MemberRequestDetailResponse> approveRequest(
            @PathVariable UUID requestId,
            @RequestBody(required = false) ApproveMemberRequest request,
            Authentication authentication) {
        UUID librarianId = ((AccountUserDetails) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(approvalService.approveRequest(requestId, librarianId, request));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<MemberRequestDetailResponse> rejectRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody RejectMemberRequest request,
            Authentication authentication) {
        UUID librarianId = ((AccountUserDetails) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(approvalService.rejectRequest(requestId, librarianId, request));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<java.util.Map<String, String>> handleNotFound(AccountNotFoundException ex) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                .body(java.util.Map.of("error", "ACCOUNT_NOT_FOUND", "message", ex.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<java.util.Map<String, String>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                .body(java.util.Map.of("error", "INVALID_STATE", "message", ex.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<java.util.Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
                .body(java.util.Map.of("error", "BAD_REQUEST", "message", ex.getMessage()));
    }
}
