package com.libtrack.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.common.email.EmailService;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration TOKEN_LIFETIME = Duration.ofMinutes(15);
    private static final Duration RATE_LIMIT_COOLDOWN = Duration.ofSeconds(60);

    private final UserAccountRepository accounts;
    private final PasswordResetTokenRepository tokens;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SessionRegistry sessionRegistry;
    private final Clock clock;
    private final String frontendBaseUrl;

    public PasswordResetService(
            UserAccountRepository accounts,
            PasswordResetTokenRepository tokens,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            SessionRegistry sessionRegistry,
            @Qualifier("libraryClock") Optional<Clock> clock,
            @Value("${libtrack.frontend-base-url:${libtrack.registration.frontend-base-url:http://localhost:4200}}") String frontendBaseUrl) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.sessionRegistry = sessionRegistry;
        this.clock = clock.orElseGet(Clock::systemUTC);
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    @Transactional
    public PasswordResetResponse processForgotPassword(String rawEmail) {
        String normalizedEmail = InstitutionalEmailPolicy.normalize(rawEmail);
        if (normalizedEmail == null) {
            return genericResponse();
        }

        UserAccount account = accounts.findByEmailForUpdate(normalizedEmail).orElse(null);
        if (account == null) {
            log.info("Password reset requested for non-existent email.");
            return genericResponse();
        }

        if (!account.isEnabled()) {
            log.info("Password reset requested for disabled or unverified accountId={}", account.getId());
            return genericResponse();
        }

        Instant now = clock.instant();

        // Rate limiting: check if a token was recently issued for this account
        Optional<PasswordResetToken> lastToken = tokens.findTopByAccountIdOrderByCreatedAtDesc(account.getId());
        if (lastToken.isPresent()) {
            Instant recentThreshold = lastToken.get().getCreatedAt().plus(RATE_LIMIT_COOLDOWN);
            if (now.isBefore(recentThreshold)) {
                log.warn("Password reset rate limit active for accountId={}. Request throttled.", account.getId());
                return genericResponse();
            }
        }

        // Generate cryptographically secure random token (32 bytes url-safe base64)
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String tokenHash = hashToken(rawToken);

        Instant expiresAt = now.plus(TOKEN_LIFETIME);
        PasswordResetToken resetToken = new PasswordResetToken(account.getId(), tokenHash, expiresAt, now);
        tokens.save(resetToken);

        log.info("Password reset token generated for accountId={} expiresAt={}", account.getId(), expiresAt);

        // Send email via EmailService (Resend)
        String resetUrl = frontendBaseUrl + "/reset-password?token=" + rawToken;
        String displayName = resolveDisplayName(account);
        String subject = "Reset Your LibTrack Password";
        String htmlContent = buildHtmlEmail(displayName, resetUrl);
        String textContent = buildTextEmail(displayName, resetUrl);

        try {
            emailService.sendEmail(account.getEmail(), subject, htmlContent, textContent);
        } catch (Exception ex) {
            log.error("Failed to deliver password reset email for accountId={} email={}: {}",
                    account.getId(), maskEmail(account.getEmail()), ex.getMessage());
            // Intentionally return generic response to prevent account-enumeration side channels
        }

        return genericResponse();
    }

    @Transactional
    public PasswordResetResponse resetPassword(String rawToken, String newPassword, HttpServletRequest currentRequest) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() < 30 || rawToken.length() > 100) {
            log.debug("Password reset rejected: malformed token");
            throw new InvalidPasswordResetTokenException("Password reset token is invalid or has expired.");
        }

        if (!PasswordPolicy.satisfies(newPassword)) {
            throw new IllegalArgumentException("Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.");
        }

        String tokenHash = hashToken(rawToken);
        PasswordResetToken token = tokens.findByTokenHashForUpdate(tokenHash).orElse(null);
        Instant now = clock.instant();

        if (token == null) {
            log.debug("Password reset rejected: token hash not found");
            throw new InvalidPasswordResetTokenException("Password reset token is invalid or has expired.");
        }

        if (!token.isUsableAt(now)) {
            log.warn("Password reset rejected: token accountId={} already consumed or expired (consumedAt={}, expiresAt={})",
                    token.getAccountId(), token.getConsumedAt(), token.getExpiresAt());
            throw new InvalidPasswordResetTokenException("Password reset token is invalid or has expired.");
        }

        UserAccount account = accounts.findById(token.getAccountId()).orElse(null);
        if (account == null) {
            log.warn("Password reset rejected: account missing for accountId={}", token.getAccountId());
            throw new InvalidPasswordResetTokenException("Password reset token is invalid or has expired.");
        }

        // Hash new password using BCrypt
        String encodedPassword = passwordEncoder.encode(newPassword);
        account.updatePassword(encodedPassword);
        token.consume(now);

        accounts.flush();
        tokens.flush();

        log.info("Password successfully updated for accountId={}", account.getId());

        // Invalidate all active sessions for this account
        invalidateUserSessions(account.getEmail(), currentRequest);

        return new PasswordResetResponse("Password has been reset successfully. You can now sign in with your new password.");
    }

    private void invalidateUserSessions(String email, HttpServletRequest currentRequest) {
        try {
            if (sessionRegistry != null) {
                for (Object principal : sessionRegistry.getAllPrincipals()) {
                    String username = null;
                    if (principal instanceof UserDetails ud) {
                        username = ud.getUsername();
                    } else if (principal instanceof String s) {
                        username = s;
                    }
                    if (username != null && username.equalsIgnoreCase(email)) {
                        for (SessionInformation sessionInfo : sessionRegistry.getAllSessions(principal, false)) {
                            sessionInfo.expireNow();
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Session invalidation via SessionRegistry encountered an issue: {}", ex.getMessage());
        }

        if (currentRequest != null) {
            try {
                HttpSession session = currentRequest.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
            } catch (Exception ignored) {}
            SecurityContextHolder.clearContext();
        }
    }

    private PasswordResetResponse genericResponse() {
        return new PasswordResetResponse("If an account with that email exists, password reset instructions have been sent.");
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return local + domain;
        return local.substring(0, 2) + "***" + domain;
    }

    private String resolveDisplayName(UserAccount user) {
        if (user.getInstitutionalId() != null && !user.getInstitutionalId().isBlank()) {
            return user.getInstitutionalId();
        }
        String email = user.getEmail();
        if (email != null && email.contains("@")) {
            String local = email.substring(0, email.indexOf('@'));
            if (!local.isBlank()) {
                return local.substring(0, 1).toUpperCase(Locale.ROOT) + local.substring(1);
            }
        }
        return email != null ? email : "Member";
    }

    static String hashToken(String raw) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 algorithm missing", impossible);
        }
    }

    private String buildHtmlEmail(String displayName, String resetUrl) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "  <title>Reset Your LibTrack Password</title>\n" +
                "</head>\n" +
                "<body style=\"margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#172321;line-height:1.6;\">\n" +
                "  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color:#FAF9F6;padding:40px 16px;\">\n" +
                "    <tr>\n" +
                "      <td align=\"center\">\n" +
                "        <table role=\"presentation\" width=\"100%\" style=\"max-width:560px;background-color:#FFFFFF;border:1px solid #E5E8E2;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);\">\n" +
                "          <tr>\n" +
                "            <td style=\"background-color:#003D30;padding:26px 32px;text-align:left;\">\n" +
                "              <span style=\"display:inline-block;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;font-family:Georgia,serif;\">LibTrack</span>\n" +
                "              <div style=\"font-size:12px;color:#8ED3BB;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;\">VIT-AP Central Library • Security</div>\n" +
                "            </td>\n" +
                "          </tr>\n" +
                "          <tr>\n" +
                "            <td style=\"padding:32px;\">\n" +
                "              <h2 style=\"margin:0 0 16px;font-size:20px;font-weight:700;color:#003D30;font-family:Georgia,serif;\">Reset Your Password</h2>\n" +
                "              <p style=\"margin:0 0 16px;font-size:15px;color:#35445A;\">Hello <strong>" + displayName + "</strong>,</p>\n" +
                "              <p style=\"margin:0 0 24px;font-size:15px;color:#35445A;\">We received a request to reset the password for your LibTrack library account. Click the button below to choose a new password:</p>\n" +
                "              <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:0 0 28px;\">\n" +
                "                <tr>\n" +
                "                  <td align=\"center\" style=\"border-radius:8px;background-color:#003D30;\">\n" +
                "                    <a href=\"" + resetUrl + "\" target=\"_blank\" style=\"display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#003D30;letter-spacing:0.02em;\">Reset Password</a>\n" +
                "                  </td>\n" +
                "                </tr>\n" +
                "              </table>\n" +
                "              <div style=\"background-color:#EAF2EF;border-left:4px solid:#003D30;border-radius:4px;padding:12px 16px;margin-bottom:24px;\">\n" +
                "                <p style=\"margin:0;font-size:13.5px;color:#003D30;font-weight:600;\">⏱ This password reset link expires in 15 minutes.</p>\n" +
                "                <p style=\"margin:4px 0 0;font-size:13px;color:#4B5552;\">It can be used once. If expired, submit another request from the login page.</p>\n" +
                "              </div>\n" +
                "              <p style=\"margin:0 0 16px;font-size:13.5px;color:#69746F;\">If you did not request a password reset, you can safely ignore this email. Your existing password remains secure and your account has not been changed.</p>\n" +
                "              <p style=\"margin:24px 0 0;font-size:13px;color:#8A938E;border-top:1px solid #E5E8E2;padding-top:20px;\">\n" +
                "                If the button above does not work, copy and paste this link into your browser:<br>\n" +
                "                <a href=\"" + resetUrl + "\" style=\"color:#003D30;word-break:break-all;font-size:12px;\">" + resetUrl + "</a>\n" +
                "              </p>\n" +
                "            </td>\n" +
                "          </tr>\n" +
                "          <tr>\n" +
                "            <td style=\"background-color:#FAF9F6;padding:20px 32px;border-top:1px solid #E5E8E2;text-align:center;\">\n" +
                "              <p style=\"margin:0;font-size:12px;color:#69746F;\"><strong>LibTrack Team</strong> • VIT-AP Central Library</p>\n" +
                "              <p style=\"margin:4px 0 0;font-size:11.5px;color:#8A938E;\">VIT-AP University, Amaravati, Andhra Pradesh, India</p>\n" +
                "            </td>\n" +
                "          </tr>\n" +
                "        </table>\n" +
                "      </td>\n" +
                "    </tr>\n" +
                "  </table>\n" +
                "</body>\n" +
                "</html>";
    }

    private String buildTextEmail(String displayName, String resetUrl) {
        return "LibTrack — Reset Your LibTrack Password\n" +
                "VIT-AP Central Library\n\n" +
                "Hello " + displayName + ",\n\n" +
                "We received a request to reset the password for your LibTrack library account.\n\n" +
                "To choose a new password, open the following link:\n" +
                resetUrl + "\n\n" +
                "Important:\n" +
                "- This link expires in 15 minutes.\n" +
                "- It can be used only once.\n\n" +
                "If you did not request a password reset, you can safely ignore this email. Your existing password remains secure.\n\n" +
                "—\n" +
                "LibTrack Team • VIT-AP Central Library\n" +
                "VIT-AP University, Amaravati, Andhra Pradesh\n";
    }
}
