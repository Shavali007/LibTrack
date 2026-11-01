package com.libtrack.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final DisplayNameGenerationService nameGenerationService;

    public RegistrationService(UserAccountRepository accounts,
                               PasswordEncoder passwordEncoder,
                               DisplayNameGenerationService nameGenerationService) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.nameGenerationService = nameGenerationService;
    }

    @Transactional
    public RegistrationPendingResponse register(RegistrationRequest request) {
        String email = InstitutionalEmailPolicy.normalize(request.email());
        var existingAccount = accounts.findByEmail(email);
        if (existingAccount.isPresent()) {
            throw new EmailAlreadyExistsException(existingAccount.get().getApprovalStatus());
        }

        String username = request.effectiveUsername();
        String displayName = username != null && !username.isBlank()
                ? username.trim()
                : nameGenerationService.generateDisplayName(email);

        String derivedInstitutionalId = null;
        if (request.role() == RegistrationRole.STUDENT) {
            derivedInstitutionalId = InstitutionalEmailPolicy.extractStudentId(email);
            if (derivedInstitutionalId != null && accounts.existsByInstitutionalId(derivedInstitutionalId)) {
                throw new AccountIdentityConflictException();
            }
        }

        UserAccount pending = UserAccount.pendingSelfRegistration(
                email,
                passwordEncoder.encode(request.password()),
                AccountRole.valueOf(request.role().name()),
                displayName,
                derivedInstitutionalId
        );

        try {
            accounts.saveAndFlush(pending);
            return RegistrationPendingResponse.pending();
        } catch (DataIntegrityViolationException exception) {
            var existing = accounts.findByEmail(email);
            if (existing.isPresent()) {
                throw new EmailAlreadyExistsException(existing.get().getApprovalStatus());
            }
            throw new AccountIdentityConflictException();
        }
    }
}
