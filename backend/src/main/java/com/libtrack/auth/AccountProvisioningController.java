package com.libtrack.auth;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/librarian/accounts")
@Validated
public class AccountProvisioningController {
    private final AccountProvisioningService provisioningService;

    public AccountProvisioningController(AccountProvisioningService provisioningService) {
        this.provisioningService = provisioningService;
    }

    @PostMapping
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<UserProfileResponse> provision(@Valid @RequestBody ProvisionAccountRequest request,
                                                         Authentication authentication) {
        AccountUserDetails librarian = (AccountUserDetails) authentication.getPrincipal();
        UserProfileResponse created = provisioningService.provisionMember(request, librarian.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{accountId}/disable")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID accountId) {
        provisioningService.deactivate(accountId);
        return ResponseEntity.noContent().build();
    }
}
