package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("production-check")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:libtrack-production-check;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
class ProductionVerificationRestrictionsTest {

    @Autowired private MockMvc mvc;
    @Autowired private UserAccountRepository accounts;
    @Autowired private PasswordEncoder passwordEncoder;
    private final ObjectMapper json = new ObjectMapper();

    @Test
    @DisplayName("Development mail capture is unauthorized outside development profile")
    void devMailCaptureUnauthorizedOutsideDevProfile() throws Exception {
        mvc.perform(get("/api/v1/dev/mail-capture")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/dev/mail-capture/diagnostics")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Registration succeeds without Resend/email configuration and creates PENDING_APPROVAL account")
    void registrationSucceedsWithoutResendConfigurationAndAccountIsPendingApproval() throws Exception {
        String email = "faculty.approval@vitap.ac.in";
        String institutionalId = "FAC9001";

        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Dr. Faculty One",
                        "institutionalId", institutionalId,
                        "email", email,
                        "role", "FACULTY",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        UserAccount registered = accounts.findByEmail(email).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_APPROVAL, registered.getApprovalStatus());
        assertFalse(registered.isEnabled());
        assertEquals("Dr. Faculty One", registered.getDisplayName());
        assertNull(registered.getInstitutionalId());
    }

    @Test
    @DisplayName("Pending account cannot log in and receives ACCOUNT_PENDING_APPROVAL")
    void pendingAccountCannotLogIn() throws Exception {
        String email = "rahul.23bce1001@vitapstudent.ac.in";
        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Rahul Kumar",
                        "institutionalId", "23BCE1001",
                        "email", email,
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isAccepted());

        mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", email,
                        "password", "SecurePass1!"
                ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_PENDING_APPROVAL"))
                .andExpect(jsonPath("$.message").value("Your account registration is awaiting librarian approval. You will be able to sign in once approved."));
    }

    @Test
    @DisplayName("Approved account can log in successfully")
    void approvedAccountCanLogIn() throws Exception {
        String email = "priya.23bce1002@vitapstudent.ac.in";
        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Priya Sharma",
                        "institutionalId", "23BCE1002",
                        "email", email,
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isAccepted());

        UserAccount registered = accounts.findByEmail(email).orElseThrow();
        registered.approve(UUID.randomUUID(), "All verified", Instant.now());
        accounts.saveAndFlush(registered);

        mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", email,
                        "password", "SecurePass1!"
                ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    @DisplayName("Rejected account cannot log in and receives ACCOUNT_REJECTED")
    void rejectedAccountCannotLogIn() throws Exception {
        String email = "arjun.23bce1003@vitapstudent.ac.in";
        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Arjun Reddy",
                        "institutionalId", "23BCE1003",
                        "email", email,
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isAccepted());

        UserAccount registered = accounts.findByEmail(email).orElseThrow();
        registered.reject(UUID.randomUUID(), "Information mismatch", "ID does not match records", Instant.now());
        accounts.saveAndFlush(registered);

        mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", email,
                        "password", "SecurePass1!"
                ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_REJECTED"))
                .andExpect(jsonPath("$.message").value("Your account registration request has been rejected. Please contact library staff for assistance."));
    }

    @Test
    @DisplayName("Duplicate registration is rejected with IDENTITY_CONFLICT")
    void duplicateRegistrationIsRejected() throws Exception {
        String email = "kavya.23bce1004@vitapstudent.ac.in";
        String institutionalId = "23BCE1004";

        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Kavya Rao",
                        "institutionalId", institutionalId,
                        "email", email,
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isAccepted());

        // Attempt same email
        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Duplicate Student",
                        "institutionalId", "23BCE9999",
                        "email", email,
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));

        // Attempt same institutional ID
        mvc.perform(post("/api/v1/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "fullName", "Another Student",
                        "institutionalId", institutionalId,
                        "email", "another.23bce1004@vitapstudent.ac.in",
                        "role", "STUDENT",
                        "password", "SecurePass1!",
                        "confirmPassword", "SecurePass1!"
                ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDENTITY_CONFLICT"));
    }

    @Test
    @DisplayName("Existing librarian login remains functional")
    void existingLibrarianLoginRemainsFunctional() throws Exception {
        String librarianEmail = "admin.production@vitap.ac.in";
        UserAccount librarian = accounts.save(UserAccount.initialLibrarian(
                librarianEmail,
                passwordEncoder.encode("AdminSecret1!")
        ));

        mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", librarianEmail,
                        "password", "AdminSecret1!"
                ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(librarianEmail))
                .andExpect(jsonPath("$.role").value("LIBRARIAN"));
    }
}
