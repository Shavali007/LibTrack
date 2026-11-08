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
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from UserAccount account where account.id = :id")
    Optional<UserAccount> findByIdForUpdate(@Param("id") UUID id);
    Optional<UserAccount> findByIdAndEnabledTrue(UUID id);
    boolean existsByEmail(String email);
    boolean existsByInstitutionalId(String institutionalId);
    boolean existsByDisplayNameIgnoreCaseAndIdNot(String displayName, UUID id);
    Optional<UserAccount> findByDisplayNameIgnoreCase(String displayName);
    boolean existsByRole(AccountRole role);
    Optional<UserAccount> findFirstByRoleAndEnabledTrue(AccountRole role);

    @Query("select count(u) from UserAccount u where u.enabled = true and (u.role = com.libtrack.auth.AccountRole.STUDENT or u.role = com.libtrack.auth.AccountRole.FACULTY)")
    long countActiveMembers();

    @Query("select count(u) from UserAccount u where u.approvalStatus = :status and (u.role = com.libtrack.auth.AccountRole.STUDENT or u.role = com.libtrack.auth.AccountRole.FACULTY)")
    long countByApprovalStatusForMembers(@Param("status") ApprovalStatus status);

    @Query("select u from UserAccount u where u.role = com.libtrack.auth.AccountRole.FACULTY and u.enabled = true and u.approvalStatus = com.libtrack.auth.ApprovalStatus.APPROVED order by coalesce(u.displayName, u.email) asc")
    java.util.List<UserAccount> findAllApprovedFaculty();
}
