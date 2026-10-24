package com.libtrack.auth;

import java.util.Locale;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy contextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
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
        } catch (BadCredentialsException | DisabledException | LockedException |
                 AccountExpiredException | CredentialsExpiredException exception) {
            contextHolderStrategy.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthenticationError("INVALID_CREDENTIALS", "Email or password is incorrect."));
        }
    }

    @GetMapping("/me")
    public UserProfileResponse currentUser(Authentication authentication) {
        return UserProfileResponse.from((AccountUserDetails) authentication.getPrincipal());
    }
}


