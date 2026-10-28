package com.libtrack.auth;
import java.nio.charset.StandardCharsets; import java.security.*; import java.time.*; import java.util.*;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service
public class RegistrationVerificationService{
 private static final SecureRandom RANDOM=new SecureRandom();
 private static final Logger log=LoggerFactory.getLogger(RegistrationVerificationService.class);
 private final UserAccountRepository accounts; private final EmailVerificationTokenRepository tokens;
 private final VerificationMessageSender sender; private final Clock clock; private final Duration lifetime; private final String frontendBaseUrl;
 public RegistrationVerificationService(UserAccountRepository accounts,EmailVerificationTokenRepository tokens,VerificationMessageSender sender,@Qualifier("libraryClock") Clock clock,
  @Value("${libtrack.registration.verification-token-ttl:PT24H}") Duration lifetime,
  @Value("${libtrack.registration.frontend-base-url:http://localhost:4200}") String frontendBaseUrl){
  if(lifetime.isZero()||lifetime.isNegative())throw new IllegalArgumentException("Verification token lifetime must be positive.");
  this.accounts=accounts;this.tokens=tokens;this.sender=sender;this.clock=clock;this.lifetime=lifetime;this.frontendBaseUrl=frontendBaseUrl.replaceAll("/+$","");
 }
 @Transactional public void issue(UserAccount account){
  byte[] bytes=new byte[32];RANDOM.nextBytes(bytes);String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);Instant now=clock.instant();
  tokens.save(new EmailVerificationToken(account.getId(),hash(raw),now.plus(lifetime),now));
  String link=frontendBaseUrl+"/verify-email#"+raw;
  sender.send(new VerificationMessage(account.getEmail(),"Verify your LibTrack account","Complete your email verification using the link below. It expires after "+lifetime.toHours()+" hours.\n\n"+link,link));
  log.info("Email verification issued for accountId={} expiresAt={}",account.getId(),now.plus(lifetime));
 }
 @Transactional public void reissuePending(String email){
  String normalized=InstitutionalEmailPolicy.normalize(email);
  if(normalized==null)return;
  UserAccount account=accounts.findByEmailForUpdate(normalized).orElse(null);
  if(account==null||account.isEnabled()||account.getProvisioningSource()!=ProvisioningSource.SELF_REGISTRATION
      ||(account.getRole()!=AccountRole.STUDENT&&account.getRole()!=AccountRole.FACULTY))return;
  issue(account);
 }
 @Transactional public boolean verify(String raw){
  if(raw==null||raw.length()<40||raw.length()>100){log.debug("Email verification rejected: reason=malformed_token");return false;}
  EmailVerificationToken token=tokens.findByTokenHashForUpdate(hash(raw)).orElse(null);Instant now=clock.instant();
  if(token==null){log.debug("Email verification rejected: reason=token_hash_not_found");return false;}
  if(!token.isUsableAt(now)){log.debug("Email verification rejected: accountId={} reason={}",token.getAccountId(),token.getConsumedAt()==null?"expired":"already_consumed");return false;}
  UserAccount account=accounts.findById(token.getAccountId()).orElse(null);
  if(account==null){log.warn("Email verification rejected: accountId={} reason=account_missing",token.getAccountId());return false;}
  if(account.isEnabled()||account.getProvisioningSource()!=ProvisioningSource.SELF_REGISTRATION
      ||(account.getRole()!=AccountRole.STUDENT&&account.getRole()!=AccountRole.FACULTY)){
   log.warn("Email verification rejected: accountId={} reason=account_not_eligible",account.getId());return false;
  }
  account.activateAfterEmailVerification();token.consume(now);accounts.flush();tokens.flush();
  log.info("Email verification completed for accountId={}",account.getId());return true;
 }
 @Transactional(readOnly=true) public VerificationDiagnostic diagnose(String raw){
  if(raw==null||raw.length()<40||raw.length()>100)return new VerificationDiagnostic("NOT_FOUND",null);
  EmailVerificationToken token=tokens.findByTokenHash(hash(raw)).orElse(null);
  if(token==null)return new VerificationDiagnostic("NOT_FOUND",null);
  UserAccount account=accounts.findById(token.getAccountId()).orElse(null);Instant now=clock.instant();
  String status=token.getConsumedAt()!=null?"ALREADY_USED":!token.getExpiresAt().isAfter(now)?"EXPIRED":account==null?"ACCOUNT_MISSING":account.isEnabled()?"ACCOUNT_ALREADY_ACTIVE":"CURRENT";
  return new VerificationDiagnostic(status,token.getExpiresAt());
 }
 public record VerificationDiagnostic(String status,Instant expiresAt){}
 static String hash(String token){
  try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII)));}
  catch(NoSuchAlgorithmException impossible){throw new IllegalStateException("SHA-256 is required by the Java runtime.",impossible);}
 }
}
