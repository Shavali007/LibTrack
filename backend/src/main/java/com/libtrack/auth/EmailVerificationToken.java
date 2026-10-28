package com.libtrack.auth;
import java.time.Instant; import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="email_verification_token")
public class EmailVerificationToken{
 @Id @Column(name="account_id",nullable=false,columnDefinition="BINARY(16)") private UUID accountId;
 @Column(name="token_hash",nullable=false,length=64,unique=true,columnDefinition="CHAR(64)") private String tokenHash;
 @Column(name="expires_at",nullable=false) private Instant expiresAt;
 @Column(name="consumed_at") private Instant consumedAt;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected EmailVerificationToken(){}
 public EmailVerificationToken(UUID id,String hash,Instant expiry,Instant created){accountId=id;tokenHash=hash;expiresAt=expiry;createdAt=created;}
 public UUID getAccountId(){return accountId;} public Instant getExpiresAt(){return expiresAt;} public Instant getConsumedAt(){return consumedAt;}
 String getTokenHash(){return tokenHash;}
 public boolean isUsableAt(Instant now){return consumedAt==null&&expiresAt.isAfter(now);}
 public void consume(Instant now){consumedAt=now;}
}

