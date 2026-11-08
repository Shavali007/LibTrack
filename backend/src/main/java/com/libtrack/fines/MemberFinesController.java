package com.libtrack.fines;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountUserDetails;

@RestController
@RequestMapping("/api/v1/fines")
@PreAuthorize("hasAnyRole('STUDENT','FACULTY')")
public class MemberFinesController {
    private final FineService fineService;

    public MemberFinesController(FineService fineService) {
        this.fineService = fineService;
    }

    @GetMapping("/mine")
    public ResponseEntity<List<FineRecordResponse>> getMyFines(Authentication auth) {
        UUID accountId = ((AccountUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(fineService.getMemberFines(accountId));
    }

    @GetMapping("/summary")
    public ResponseEntity<MemberFineSummaryResponse> getMySummary(Authentication auth) {
        UUID accountId = ((AccountUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(fineService.getMemberSummary(accountId));
    }

    @GetMapping("/{fineId}")
    public ResponseEntity<FineRecordResponse> getMyFine(
            @org.springframework.web.bind.annotation.PathVariable UUID fineId,
            Authentication auth) {
        UUID accountId = ((AccountUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(fineService.getMemberFine(fineId, accountId));
    }
}
