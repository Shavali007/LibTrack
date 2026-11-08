package com.libtrack.librarian;

import java.util.UUID;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.libtrack.auth.AccountRole;
import com.libtrack.catalogue.PageResponse;

@RestController
@RequestMapping("/api/v1/librarian/members")
@Validated
public class LibrarianMemberController {
    private final LibrarianMemberService memberService;

    public LibrarianMemberController(LibrarianMemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    @PreAuthorize("hasRole('LIBRARIAN')")
    public PageResponse<MemberSummaryResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AccountRole role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) String department,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return memberService.listMembers(q, role, enabled, department, page, size);
    }

    @GetMapping("/{memberId}")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public MemberDetailResponse get(@PathVariable UUID memberId) {
        return memberService.getMemberDetails(memberId);
    }

    @PostMapping("/{memberId}/department")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<MemberDetailResponse> updateDepartment(@PathVariable UUID memberId,
                                                                 @RequestBody Map<String, String> request) {
        String department = request != null ? request.get("department") : null;
        MemberDetailResponse updated = memberService.updateMemberDepartment(memberId, department);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{memberId}/status")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> updateStatus(@PathVariable UUID memberId,
                                            @RequestBody MemberStatusUpdateRequest request) {
        memberService.updateAccountStatus(memberId, request.enabled());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{memberId}/enable")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> enable(@PathVariable UUID memberId) {
        memberService.updateAccountStatus(memberId, true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{memberId}/disable")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> disable(@PathVariable UUID memberId) {
        memberService.updateAccountStatus(memberId, false);
        return ResponseEntity.noContent().build();
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "INVALID_ARGUMENT", "message", exception.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleInvalidAccountState(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "INVALID_STATE", "message", exception.getMessage()));
    }
}
