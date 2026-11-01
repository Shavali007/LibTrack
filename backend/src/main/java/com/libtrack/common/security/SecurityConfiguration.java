package com.libtrack.common.security;

import jakarta.servlet.DispatcherType;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.session.HttpSessionEventPublisher;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    static HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    SecurityFilterChain applicationSecurity(HttpSecurity http,
                                            SecurityContextRepository securityContextRepository,
                                            SessionRegistry sessionRegistry,
                                            Environment environment) throws Exception {
        return http
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("frame-ancestors 'self' http://localhost:4200 http://localhost:8080")
                )
            )
            .csrf(csrf -> csrf
                .csrfTokenRepository(new HttpSessionCsrfTokenRepository())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .authorizeHttpRequests(authorize -> {
                authorize.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();
                authorize.requestMatchers("/api/health", "/swagger-ui/**", "/v3/api-docs/**",
                        "/api/v1/auth/csrf", "/api/v1/auth/login", "/api/v1/auth/register",
                        "/api/v1/auth/verify-email",
                        "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password").permitAll();
                if (environment.acceptsProfiles(Profiles.of("development"))) {
                    authorize.requestMatchers("/api/v1/dev/mail-capture", "/api/v1/dev/mail-capture/**").permitAll();
                }
                authorize.requestMatchers("/api/v1/auth/me", "/api/v1/auth/profile", "/api/v1/auth/logout", "/api/v1/librarian/**").authenticated();
                authorize.requestMatchers(HttpMethod.GET, "/api/v1/books", "/api/v1/books/*", "/api/v1/books/*/digital-edition", "/api/v1/books/*/reviews", "/api/v1/books/*/reviews/summary", "/api/v1/books/reviews/summaries", "/api/v1/categories").permitAll();
                authorize.requestMatchers("/api/v1/books", "/api/v1/books/**", "/api/v1/categories",
                        "/api/v1/borrow-requests", "/api/v1/borrow-requests/**",
                        "/api/v1/loans", "/api/v1/loans/**",
                        "/api/v1/holidays", "/api/v1/holidays/**",
                        "/api/v1/feedback", "/api/v1/feedback/**",
                        "/api/v1/notifications", "/api/v1/notifications/**",
                        "/api/v1/policies", "/api/v1/policies/**",
                        "/api/v1/recommendations", "/api/v1/recommendations/**",
                        "/api/v1/reservations", "/api/v1/reservations/**",
                        "/api/v1/wishlist", "/api/v1/wishlist/**",
                        "/api/v1/fines", "/api/v1/fines/**").authenticated();
                authorize.anyRequest().denyAll();
            })
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionFixation(fixation -> fixation.changeSessionId())
                .maximumSessions(-1).sessionRegistry(sessionRegistry))
            .requestCache(cache -> cache.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .logout(logout -> logout
                .logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors.authenticationEntryPoint(
                (request, response, exception) -> response.sendError(401)))
            .build();
    }
}
