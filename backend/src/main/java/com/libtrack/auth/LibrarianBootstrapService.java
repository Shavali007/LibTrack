package com.libtrack.auth;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LibrarianBootstrapService {
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;

    public LibrarianBootstrapService(UserAccountRepository accounts,
                                     PasswordEncoder passwordEncoder,
                                     Validator validator) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
    }

    @Transactional
    public void createInitialLibrarian(String emailInput, String password) {
        String email = emailInput == null ? null : emailInput.strip().toLowerCase(Locale.ROOT);
        BootstrapLibrarianRequest request = new BootstrapLibrarianRequest(email, password);
        Set<ConstraintViolation<BootstrapLibrarianRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            List<String> errors = violations.stream()
                    .map(violation -> {
                        String path = violation.getPropertyPath().toString();
                        String field = path.equals("email") ? "email" : "password";
                        return field + ": " + violation.getMessage();
                    })
                    .distinct()
                    .sorted(Comparator.naturalOrder())
                    .toList();
            throw new IllegalArgumentException("Initial Librarian account validation failed: "
                    + String.join("; ", errors) + ".");
        }
        if (accounts.existsByRole(AccountRole.LIBRARIAN)) {
            throw new IllegalStateException("A Librarian account already exists; the bootstrap command is one-time.");
        }

        if (accounts.existsByEmail(email)) {
            throw new AccountIdentityConflictException();
        }
        try {
            accounts.saveAndFlush(UserAccount.initialLibrarian(email, passwordEncoder.encode(password)));
        } catch (DataIntegrityViolationException exception) {
            throw new AccountIdentityConflictException();
        }
    }
}