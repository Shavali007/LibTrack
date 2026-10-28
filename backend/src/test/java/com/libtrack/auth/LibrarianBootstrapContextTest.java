package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:libtrack-bootstrap;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "libtrack.library-zone=UTC"
})
class LibrarianBootstrapContextTest {
    @Autowired ApplicationContext applicationContext;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired LibrarianBootstrapService bootstrapService;
    @Autowired UserAccountRepository accounts;

    @BeforeEach
    void clearAccounts() {
        accounts.deleteAll();
    }

    @Test
    void nonWebBootstrapContextKeepsProvisioningServicesWithoutHttpAuthenticationBeans() {
        assertFalse(applicationContext.containsBean("authenticationManager"));
        assertFalse(applicationContext.containsBean("authController"));
        assertNotNull(passwordEncoder);
        assertNotNull(bootstrapService);
    }

    @Test
    void acceptsValidCredentialsNormalizesEmailAndStoresOnlyEncodedPassword() {
        String password = "Secure librarian pass 123!";

        bootstrapService.createInitialLibrarian("  Librarian@Example.edu  ", password);

        UserAccount created = accounts.findByEmail("librarian@example.edu").orElseThrow();
        assertEquals(AccountRole.LIBRARIAN, created.getRole());
        assertTrue(passwordEncoder.matches(password, created.getPasswordHash()));
        assertFalse(password.equals(created.getPasswordHash()));
    }

    @Test
    void reportsInvalidEmailFieldWithoutIncludingPassword() {
        String password = "Secure librarian pass 123!";

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> bootstrapService.createInitialLibrarian("not-an-email", password));

        assertTrue(exception.getMessage().contains("email"));
        assertFalse(exception.getMessage().contains(password));
        assertTrue(accounts.findAll().isEmpty());
    }

    @Test
    void reportsPasswordPolicyFailureWithoutIncludingPassword() {
        String password = "short";

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> bootstrapService.createInitialLibrarian("librarian@example.edu", password));

        assertTrue(exception.getMessage().contains("password"));
        assertTrue(exception.getMessage().contains("12 characters"));
        assertFalse(exception.getMessage().contains(password));
        assertTrue(accounts.findAll().isEmpty());
    }

    @Test
    void rejectsPasswordsLongerThanBcryptUtf8ByteLimit() {
        String password = "a".repeat(73);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> bootstrapService.createInitialLibrarian("librarian@example.edu", password));

        assertTrue(exception.getMessage().contains("password"));
        assertTrue(exception.getMessage().contains("72 UTF-8 bytes"));
        assertFalse(exception.getMessage().contains(password));
    }
}