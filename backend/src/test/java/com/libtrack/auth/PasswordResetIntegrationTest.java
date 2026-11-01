package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.common.email.ResendEmailService;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@LibTrackIntegrationTest
@ActiveProfiles({"test", "development"})
class PasswordResetIntegrationTest {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private PasswordResetTokenRepository tokens;

    @Autowired
    private ResendEmailService emailService;

    @Autowired
    private PasswordEncoder encoder;

    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        emailService.clearSentEmails();
    }

    private static final java.util.concurrent.atomic.AtomicInteger STUDENT_SEQ = new java.util.concurrent.atomic.AtomicInteger(50000);

    private UserAccount createActiveStudent(String email, String password) {
        UserAccount account = UserAccount.provisionMember(
                email,
                encoder.encode(password),
                AccountRole.STUDENT,
                "23BCE" + STUDENT_SEQ.incrementAndGet(),
                UUID.randomUUID(),
                Instant.now()
        );
        return accounts.save(account);
    }

    private String extractTokenFromUrl(String text) {
        // Looks for ?token=([A-Za-z0-9_-]+)
        int idx = text.indexOf("?token=");
        if (idx == -1) {
            idx = text.indexOf("#token=");
        }
        assertTrue(idx != -1, "Reset link missing in email text: " + text);
        String after = text.substring(idx + 7);
        int end = 0;
        while (end < after.length() && (Character.isLetterOrDigit(after.charAt(end)) || after.charAt(end) == '_' || after.charAt(end) == '-')) {
            end++;
        }
        return after.substring(0, end);
    }

    @Test
    void forgotPassword_unknownEmail_returnsGenericSuccessWithoutDisclosingAccountAbsence() throws Exception {
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "unknown.student@vitapstudent.ac.in"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If an account with that email exists, password reset instructions have been sent."));

        assertTrue(emailService.getSentEmails().isEmpty());
    }

    @Test
    void forgotPassword_emailDeliveryFailure_returnsIdenticalGenericResponseAsNonExistentAccount() throws Exception {
        String existingEmail = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(existingEmail, "InitialPass123!");
        String nonExistentEmail = "unknown." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";

        emailService.setSimulateFailure(true);
        try {
            var nonExistentResult = mvc.perform(post("/api/v1/auth/forgot-password")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(Map.of("email", nonExistentEmail))))
                    .andExpect(status().isOk())
                    .andReturn();

            var existingResult = mvc.perform(post("/api/v1/auth/forgot-password")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(Map.of("email", existingEmail))))
                    .andExpect(status().isOk())
                    .andReturn();

            assertEquals(nonExistentResult.getResponse().getStatus(), existingResult.getResponse().getStatus());
            assertEquals(200, existingResult.getResponse().getStatus());
            assertEquals(nonExistentResult.getResponse().getContentAsString(), existingResult.getResponse().getContentAsString());
            assertEquals("{\"message\":\"If an account with that email exists, password reset instructions have been sent.\"}",
                    existingResult.getResponse().getContentAsString());
        } finally {
            emailService.setSimulateFailure(false);
        }
    }

    @Test
    void forgotPassword_invalidEmailFormat_returnsBadRequest() throws Exception {
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "not-an-email"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void forgotPassword_existingAccount_generatesHashedTokenAndDispatchesEmail() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        UserAccount account = createActiveStudent(email, "InitialPass123!");

        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If an account with that email exists, password reset instructions have been sent."));

        assertEquals(1, emailService.getSentEmails().size());
        ResendEmailService.SentEmailRecord emailRecord = emailService.getSentEmails().getFirst();
        assertEquals(email, emailRecord.to());
        assertEquals("Reset Your LibTrack Password", emailRecord.subject());
        assertTrue(emailRecord.htmlContent().contains("Reset Password"));
        assertTrue(emailRecord.htmlContent().contains("#003D30"));
        assertTrue(emailRecord.htmlContent().contains("15 minutes"));

        // Verify that raw token is not stored in DB, only SHA-256 hash
        String rawToken = extractTokenFromUrl(emailRecord.textContent());
        assertFalse(rawToken.isBlank());

        PasswordResetToken storedToken = tokens.findTopByAccountIdOrderByCreatedAtDesc(account.getId()).orElseThrow();
        assertNotEquals(rawToken, storedToken.getTokenHash());
        assertEquals(PasswordResetService.hashToken(rawToken), storedToken.getTokenHash());
        assertNull(storedToken.getConsumedAt());
        assertTrue(storedToken.isUsableAt(Instant.now()));
    }

    @Test
    void forgotPassword_rateLimitsSubsequentImmediateRequests() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(email, "InitialPass123!");

        // First request: succeeds and dispatches email
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        assertEquals(1, emailService.getSentEmails().size());

        // Second immediate request: throttled, returns generic success, does not send second email
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If an account with that email exists, password reset instructions have been sent."));

        assertEquals(1, emailService.getSentEmails().size());
    }

    @Test
    void resetPassword_validToken_updatesPasswordAndAllowsLoginWithNewPassword() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(email, "InitialPass123!");

        // Request reset
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        String rawToken = extractTokenFromUrl(emailService.getSentEmails().getFirst().textContent());

        // Reset password
        String newPassword = "UpdatedSecurePassword456#";
        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password has been reset successfully. You can now sign in with your new password."));

        // Verify token is now consumed
        String tokenHash = PasswordResetService.hashToken(rawToken);
        PasswordResetToken consumedToken = tokens.findByTokenHash(tokenHash).orElseThrow();
        assertNotNull(consumedToken.getConsumedAt());

        // Verify old password fails to log in
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", "InitialPass123!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        // Verify new password successfully logs in
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void resetPassword_reusedToken_rejectedWithBadRequest() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(email, "InitialPass123!");

        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        String rawToken = extractTokenFromUrl(emailService.getSentEmails().getFirst().textContent());

        // First reset succeeds
        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", "FirstNewPass1!"))))
                .andExpect(status().isOk());

        // Reusing the token fails
        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", "SecondNewPass2@"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
    }

    @Test
    void resetPassword_invalidOrBogusToken_rejectedWithBadRequest() throws Exception {
        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", "non-existent-bogus-token-32-chars-long", "newPassword", "NewSecurePass1!"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
    }

    @Test
    void resetPassword_expiredToken_rejectedWithBadRequest() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        UserAccount account = createActiveStudent(email, "InitialPass123!");

        String rawToken = "sample-expired-token-32-characters-test-12345";
        String tokenHash = PasswordResetService.hashToken(rawToken);
        // Expired 1 hour ago
        PasswordResetToken expiredToken = new PasswordResetToken(
                account.getId(),
                tokenHash,
                Instant.now().minusSeconds(3600),
                Instant.now().minusSeconds(7200)
        );
        tokens.save(expiredToken);

        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", "NewSecurePass1!"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OR_EXPIRED_TOKEN"));
    }

    @Test
    void resetPassword_weakPassword_rejectedWithBadRequest() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(email, "InitialPass123!");

        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        String rawToken = extractTokenFromUrl(emailService.getSentEmails().getFirst().textContent());

        // Password lacking numbers and special characters
        mvc.perform(post("/api/v1/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", "weakpassword"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void resetPassword_invalidatesExistingSession() throws Exception {
        String email = "student." + UUID.randomUUID().toString().substring(0, 8) + "@vitapstudent.ac.in";
        createActiveStudent(email, "InitialPass123!");

        // Log in to establish an active session
        MockHttpSession session = (MockHttpSession) mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", "InitialPass123!"))))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession();

        assertNotNull(session);
        assertFalse(session.isInvalid());

        // Confirm session works for /me
        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk());

        // Request reset and reset password using this session
        mvc.perform(post("/api/v1/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        String rawToken = extractTokenFromUrl(emailService.getSentEmails().getFirst().textContent());

        mvc.perform(post("/api/v1/auth/reset-password")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", rawToken, "newPassword", "NewlyResetPass123!"))))
                .andExpect(status().isOk());

        // Session was invalidated
        assertTrue(session.isInvalid());

        // Subsequent call with that session is rejected
        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }
}
