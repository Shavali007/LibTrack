package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@LibTrackIntegrationTest
@ActiveProfiles({"test","development"})
class EmailVerificationIntegrationTest {
 @Autowired MockMvc mvc; @Autowired UserAccountRepository accounts;
 @Autowired EmailVerificationTokenRepository tokens; @Autowired DevelopmentMailCapture capture; @Autowired RegistrationVerificationService verification; @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
 private final ObjectMapper json=new ObjectMapper();
 @BeforeEach void clear(){capture.clear();}
 @Test void registrationCapturesOneLocalMessageAndPersistsOnlyTokenHash() throws Exception{
  String email=studentEmail();register(email);
  assertEquals(1,capture.messages().size());VerificationMessage message=capture.messages().getFirst();
  assertEquals(email,message.recipient());
  assertTrue(message.verificationUrl().matches("http://localhost:4200/verify-email#[A-Za-z0-9_-]{43}"));
  assertTrue(message.text().endsWith(message.verificationUrl()));
  mvc.perform(get("/api/v1/dev/mail-capture")).andExpect(status().isOk())
    .andExpect(jsonPath("$[0].verificationUrl").value(message.verificationUrl()))
    .andExpect(jsonPath("$[0].text").value(org.hamcrest.Matchers.endsWith(message.verificationUrl())));
  String token=token(message);EmailVerificationToken row=tokenRow(email);
  assertNotEquals(token,row.getTokenHash()); // raw token is never stored
  assertEquals(RegistrationVerificationService.hash(token),tokens.findById(accounts.findByEmail(email).orElseThrow().getId()).orElseThrow().getTokenHash());
 }
 @Test void validTokenActivatesAccountOnceAndThenAllowsNormalLogin() throws Exception{
  String email=studentEmail();register(email);String token=token(capture.messages().getFirst());
  mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"password","SecurePass1!"))))
    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
  verify(token).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("VERIFIED"));
  assertTrue(accounts.findByEmail(email).orElseThrow().isEnabled());
  mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"password","SecurePass1!"))))
    .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("STUDENT"));
  verify(token).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value("INVALID_OR_EXPIRED"));
 }
@org.springframework.beans.factory.annotation.Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
 @Test void v7CompatibleProvisioningCheckAllowsTokenActivationAndConsumption() throws Exception{
  jdbc.execute("alter table user_account add constraint ck_test_self_registration_audit check (provisioning_source <> 'SELF_REGISTRATION' or (role in ('STUDENT','FACULTY') and institutional_id is null and identity_verified_at is null and created_by_account_id is null))");
  String email=studentEmail();register(email);String token=token(capture.messages().getFirst());
  verify(token).andExpect(status().isOk());
  assertTrue(accounts.findByEmail(email).orElseThrow().isEnabled());
  verify(token).andExpect(status().isBadRequest());
 } @Test void reissueReplacesStaleCapturedLinkAndDiagnosticNeverReturnsToken() throws Exception{
  String email=studentEmail();register(email);String oldToken=token(capture.messages().getFirst());
  verification.reissuePending(email);
  assertEquals(1,capture.messages().size());String current=token(capture.messages().getFirst());
  assertNotEquals(oldToken,current);
  assertEquals(RegistrationVerificationService.hash(current),tokenRow(email).getTokenHash());
  verify(oldToken).andExpect(status().isBadRequest());
  mvc.perform(get("/api/v1/dev/mail-capture/diagnostics"))
    .andExpect(status().isOk()).andExpect(jsonPath("$[0].tokenStatus").value("CURRENT"))
    .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(current))))
    .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(RegistrationVerificationService.hash(current)))));
  verify(current).andExpect(status().isOk());
 } @Test void invalidExpiredAndReusedTokensAreRejected() throws Exception{
  String email=studentEmail();register(email);String token=token(capture.messages().getFirst());
  verify("invalid-token").andExpect(status().isBadRequest());
  EmailVerificationToken row=tokenRow(email);
  tokens.saveAndFlush(new EmailVerificationToken(row.getAccountId(),RegistrationVerificationService.hash(token),Instant.now().minusSeconds(1),Instant.now().minusSeconds(3600)));
  verify(token).andExpect(status().isBadRequest());
  assertFalse(accounts.findById(row.getAccountId()).orElseThrow().isEnabled());
 }
 @Test void diagnosticsEndpointRejectsNonLoopbackRequests() throws Exception{
  mvc.perform(get("/api/v1/dev/mail-capture/diagnostics").with(request-> {request.setRemoteAddr("192.0.2.9");return request;})).andExpect(status().isNotFound());
 } @Test void concurrentVerificationRequestsCanActivateOnlyOnce() throws Exception{
  String email=studentEmail();register(email);String oneTime=token(capture.messages().getFirst());
  CompletableFuture<Boolean> first=CompletableFuture.supplyAsync(()->verification.verify(oneTime));
  CompletableFuture<Boolean> second=CompletableFuture.supplyAsync(()->verification.verify(oneTime));
  boolean firstResult=first.get(10,TimeUnit.SECONDS),secondResult=second.get(10,TimeUnit.SECONDS);
  assertNotEquals(firstResult,secondResult);
  assertTrue(accounts.findByEmail(email).orElseThrow().isEnabled());
 }
 @Test void developerCanReissueForPreexistingPendingAccountWithoutActivatingIt() throws Exception{
  String email=studentEmail();
  UserAccount pending=accounts.saveAndFlush(UserAccount.pendingSelfRegistration(email,encoder.encode("SecurePass1!"),AccountRole.STUDENT));
  mvc.perform(post("/api/v1/dev/mail-capture/reissue").with(csrf()).contentType(MediaType.APPLICATION_JSON)
      .content(json.writeValueAsString(Map.of("email",email.toUpperCase())))).andExpect(status().isNoContent());
  assertFalse(accounts.findById(pending.getId()).orElseThrow().isEnabled());
  String oneTime=token(capture.messages().getFirst());
  verify(oneTime).andExpect(status().isOk());
  assertTrue(accounts.findById(pending.getId()).orElseThrow().isEnabled());
 }
 @Test void developmentMailCaptureRejectsNonLoopbackRequests() throws Exception{
  mvc.perform(get("/api/v1/dev/mail-capture").with(request-> {request.setRemoteAddr("192.0.2.9");return request;})).andExpect(status().isNotFound());
 }
 private void register(String email)throws Exception{
  mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
   .content(json.writeValueAsString(Map.of("email",email,"role","STUDENT","password","SecurePass1!","confirmPassword","SecurePass1!"))))
   .andExpect(status().isAccepted());
 }
 private org.springframework.test.web.servlet.ResultActions verify(String token)throws Exception{
  return mvc.perform(post("/api/v1/auth/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("token",token))));
 }
 private EmailVerificationToken tokenRow(String email){return tokens.findById(accounts.findByEmail(email).orElseThrow().getId()).orElseThrow();}
 private String token(VerificationMessage message){return URI.create(message.verificationUrl()).getFragment();}
 private String studentEmail(){return "verify."+String.format("%02d",UUID.randomUUID().hashCode()&99)+"mic"+String.format("%05d",Math.abs(UUID.randomUUID().hashCode())%100000)+"@vitapstudent.ac.in";}
}







