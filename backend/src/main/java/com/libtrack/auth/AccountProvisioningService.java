package com.libtrack.auth;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountProvisioningService {
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final DisplayNameGenerationService nameGenerationService;

    public AccountProvisioningService(UserAccountRepository accounts,
                                     PasswordEncoder passwordEncoder,
                                     DisplayNameGenerationService nameGenerationService) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.nameGenerationService = nameGenerationService;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public UserProfileResponse provisionMember(ProvisionAccountRequest request, UUID librarianId) {
        if (!Boolean.TRUE.equals(request.identityVerified())) {
            throw new IllegalArgumentException("Identity verification is required.");
        }
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        String institutionalId = request.institutionalId().strip();
        if (accounts.existsByEmail(email) || accounts.existsByInstitutionalId(institutionalId)) {
            throw new AccountIdentityConflictException();
        }

        String displayName = (request.displayName() != null && !request.displayName().isBlank())
                ? request.displayName().strip()
                : nameGenerationService.generateDisplayName(email);

        AccountRole role = AccountRole.valueOf(request.role().name());
        UserAccount account = UserAccount.provisionMember(email, passwordEncoder.encode(request.password()),
                role, institutionalId, librarianId, Instant.now(), displayName);
        try {
            UserAccount created = accounts.saveAndFlush(account);
            return UserProfileResponse.from(new AccountUserDetails(created));
        } catch (DataIntegrityViolationException exception) {
            throw new AccountIdentityConflictException();
        }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public void deactivate(UUID accountId) {
        UserAccount account = accounts.findById(accountId).orElseThrow(AccountNotFoundException::new);
        account.deactivate();
        accounts.flush();
    }
}
