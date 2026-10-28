package com.libtrack.auth;

import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationVerificationService verification;

    public RegistrationService(UserAccountRepository accounts, PasswordEncoder passwordEncoder, RegistrationVerificationService verification) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.verification = verification;
    }

    @Transactional
    public RegistrationPendingResponse register(RegistrationRequest request) {
        String email = InstitutionalEmailPolicy.normalize(request.email());
        if (accounts.existsByEmail(email)) throw new AccountIdentityConflictException();
        UserAccount pending = UserAccount.pendingSelfRegistration(email, passwordEncoder.encode(request.password()), AccountRole.valueOf(request.role().name()));
        try {
            UserAccount created = accounts.saveAndFlush(pending);
            verification.issue(created);
            return RegistrationPendingResponse.pending();
        } catch (DataIntegrityViolationException exception) {
            throw new AccountIdentityConflictException();
        }
    }
}