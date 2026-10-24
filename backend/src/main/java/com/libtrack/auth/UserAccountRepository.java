package com.libtrack.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByIdAndEnabledTrue(UUID id);
    boolean existsByEmail(String email);
    boolean existsByInstitutionalId(String institutionalId);
    boolean existsByRole(AccountRole role);
}
