package com.libtrack.auth;
import java.util.*; import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param;
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken,UUID>{
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select token from EmailVerificationToken token where token.tokenHash = :hash")
 Optional<EmailVerificationToken> findByTokenHashForUpdate(@Param("hash") String hash);
 Optional<EmailVerificationToken> findByTokenHash(String hash);
}
