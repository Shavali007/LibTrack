package com.libtrack.auth;

import java.util.Locale;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserAccountRepository accounts;
    private final SecurityContextHolderStrategy contextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          UserAccountRepository accounts) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.accounts = accounts;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken csrfToken) {
        return new CsrfResponse(csrfToken.getHeaderName(), csrfToken.getToken());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest servletRequest,
                                   HttpServletResponse servletResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    org.springframework.security.authentication.UsernamePasswordAuthenticationToken.unauthenticated(
                            request.email().trim().toLowerCase(Locale.ROOT), request.password()));
            if (servletRequest.getSession(false) != null) {
                servletRequest.changeSessionId();
            }
            SecurityContext context = contextHolderStrategy.createEmptyContext();
            context.setAuthentication(authentication);
            contextHolderStrategy.setContext(context);
            securityContextRepository.saveContext(context, servletRequest, servletResponse);
            return ResponseEntity.ok(UserProfileResponse.from((AccountUserDetails) authentication.getPrincipal()));
        } catch (DisabledException exception) {
            contextHolderStrategy.clearContext();
            String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
            UserAccount account = accounts.findByEmail(normalizedEmail).orElse(null);
            if (account != null && account.getApprovalStatus() == ApprovalStatus.PENDING_APPROVAL) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new AuthenticationError("ACCOUNT_PENDING_APPROVAL", "Your account registration is awaiting librarian approval. You will be able to sign in once approved."));
            }
            if (account != null && account.getApprovalStatus() == ApprovalStatus.REJECTED) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new AuthenticationError("ACCOUNT_REJECTED", "Your account registration request has been rejected. Please contact library staff for assistance."));
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthenticationError("ACCOUNT_NOT_ACTIVE", "This account is disabled. Please contact library staff for assistance."));
        } catch (BadCredentialsException | LockedException | AccountExpiredException | CredentialsExpiredException exception) {
            contextHolderStrategy.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthenticationError("INVALID_CREDENTIALS", "Email or password is incorrect."));
        }
    }

    @GetMapping("/me")
    public UserProfileResponse currentUser(Authentication authentication) {
        return UserProfileResponse.from((AccountUserDetails) authentication.getPrincipal());
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                           Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AccountUserDetails principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthenticationError("UNAUTHORIZED", "Authentication required."));
        }
        String cleaned = request.displayName() != null ? request.displayName().strip() : "";
        if (cleaned.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new AuthenticationError("INVALID_DISPLAY_NAME", "Display name cannot be empty."));
        }
        UserAccount account = accounts.findById(principal.getId()).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new AuthenticationError("ACCOUNT_NOT_FOUND", "Account not found."));
        }
        account.setDisplayName(cleaned);
        accounts.saveAndFlush(account);
        return ResponseEntity.ok(UserProfileResponse.from(new AccountUserDetails(account)));
    }
}
