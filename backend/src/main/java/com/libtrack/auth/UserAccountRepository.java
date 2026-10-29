package com.libtrack.auth;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {
    Optional<UserAccount> findByEmail(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from UserAccount account where account.email = :email")
    Optional<UserAccount> findByEmailForUpdate(@Param("email") String email);
    Optional<UserAccount> findByIdAndEnabledTrue(UUID id);
    boolean existsByEmail(String email);
    boolean existsByInstitutionalId(String institutionalId);
    boolean existsByRole(AccountRole role);

    @Query("select count(u) from UserAccount u where u.enabled = true and (u.role = com.libtrack.auth.AccountRole.STUDENT or u.role = com.libtrack.auth.AccountRole.FACULTY)")
    long countActiveMembers();
}
