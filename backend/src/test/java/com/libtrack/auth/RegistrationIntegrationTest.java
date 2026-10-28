package com.libtrack.auth;
import jakarta.servlet.DispatcherType;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import com.libtrack.LibTrackIntegrationTest;

@LibTrackIntegrationTest
class RegistrationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    private final ObjectMapper mapper = new ObjectMapper();

    @Test void studentAndFacultyRegistrationStoresHashedPendingAccountsWithoutInstitutionalIds() throws Exception {
        String studentEmail = studentEmail();
        register(studentEmail, "STUDENT", "SecurePass1!").andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));
        UserAccount student = accounts.findByEmail(studentEmail.toLowerCase(Locale.ROOT)).orElseThrow();
        assertEquals(AccountRole.STUDENT, student.getRole());
        assertFalse(student.isEnabled());
        assertNull(student.getInstitutionalId());
        assertNull(student.getIdentityVerifiedAt());
        assertEquals(ProvisioningSource.SELF_REGISTRATION, student.getProvisioningSource());
        assertTrue(encoder.matches("SecurePass1!", student.getPasswordHash()));
        assertNotEquals("SecurePass1!", student.getPasswordHash());

        String facultyEmail = "faculty." + UUID.randomUUID().toString().replace("-", "") + "@vitap.ac.in";
        register(facultyEmail, "FACULTY", "SecurePass1!").andExpect(status().isAccepted());
        UserAccount faculty = accounts.findByEmail(facultyEmail).orElseThrow();
        assertEquals(AccountRole.FACULTY, faculty.getRole());
        assertFalse(faculty.isEnabled());
        assertNull(faculty.getInstitutionalId());
    }

    @Test void studentAndFacultyEmailPoliciesRejectWrongDomainsAndMalformedLocalParts() throws Exception {
        String goodStudent = studentEmail();
        register(goodStudent.replace(".", ""), "STUDENT", "SecurePass1!").andExpect(status().isBadRequest());
        register(goodStudent.replace("@vitapstudent.ac.in", "@vitap.ac.in"), "STUDENT", "SecurePass1!")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.email").exists());
        register("shavali.2mic7248@vitapstudent.ac.in", "STUDENT", "SecurePass1!").andExpect(status().isBadRequest());
        register("shavali.23mi7248@vitapstudent.ac.in", "STUDENT", "SecurePass1!").andExpect(status().isBadRequest());
        register("shavali.23mic724@vitapstudent.ac.in", "STUDENT", "SecurePass1!").andExpect(status().isBadRequest());
        register("shavali.23mic7248@vitap.ac.in", "STUDENT", "SecurePass1!").andExpect(status().isBadRequest());
        register("faculty@vitapstudent.ac.in", "FACULTY", "SecurePass1!").andExpect(status().isBadRequest());
        register("bad..name@vitap.ac.in", "FACULTY", "SecurePass1!").andExpect(status().isBadRequest());
        register("123@vitap.ac.in", "FACULTY", "SecurePass1!").andExpect(status().isBadRequest());
        register("fac ulty@vitap.ac.in", "FACULTY", "SecurePass1!").andExpect(status().isBadRequest());
    }

    @Test void registrationEnforcesEveryPasswordRuleAndConfirmation() throws Exception {
        String email = studentEmail();
        for (String invalid : new String[]{"short1!", "lowercase1!", "UPPERCASE1!", "NoNumber!!", "MissingSpecial1"}) {
            mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(body(email, "STUDENT", invalid, invalid))).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.password").exists());
        }
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(email, "STUDENT", "SecurePass1!", "DifferentPass1!"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.confirmPassword").value("Password confirmation must match"));
    }

    @Test void registrationNormalizesEmailRejectsDuplicatesAndNeverAllowsLibrarianRole() throws Exception {
        String email = studentEmail();
        register(email, "STUDENT", "SecurePass1!").andExpect(status().isAccepted());
        register(email.toUpperCase(Locale.ROOT), "STUDENT", "SecurePass1!").andExpect(status().isConflict());
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body("admin@vitap.ac.in", "LIBRARIAN", "SecurePass1!", "SecurePass1!")))
                .andExpect(status().isBadRequest());
        assertFalse(accounts.existsByEmail("admin@vitap.ac.in"));
    }

    @Test void registrationRequiresCsrfAndPendingAccountsCannotAuthenticateOrOpenWorkspace() throws Exception {
        String email = studentEmail();
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(email, "STUDENT", "SecurePass1!", "SecurePass1!"))).andExpect(status().isForbidden());
        register(email, "STUDENT", "SecurePass1!").andExpect(status().isAccepted());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", email, "password", "SecurePass1!"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void developmentMailCaptureEndpointIsUnavailableOutsideDevelopmentProfile() throws Exception {
        mvc.perform(get("/api/v1/dev/mail-capture")).andExpect(status().isUnauthorized());
    }

    @Test void errorDispatchIsNotDeniedAsAnUnauthenticatedRequestButOrdinaryUnknownRoutesRemainDenied() throws Exception {
        mvc.perform(get("/unmapped-error-probe")).andExpect(status().isUnauthorized());
        mvc.perform(get("/unmapped-error-probe").with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            return request;
        })).andExpect(status().isNotFound());
    }
    @Test void alreadyVerifiedProvisionedAccountCanStillAuthenticate() throws Exception {
        String email = "verified-" + UUID.randomUUID() + "@example.edu";
        UserAccount librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("verified-lib-" + UUID.randomUUID() + "@example.edu", encoder.encode("LongExistingPass 1!")));
        UserAccount account = accounts.saveAndFlush(UserAccount.provisionMember(email, encoder.encode("LongExistingPass 1!"),
                AccountRole.FACULTY, "FAC-" + UUID.randomUUID(), UUID.randomUUID(), java.time.Instant.now()));
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", email, "password", "LongExistingPass 1!"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("FACULTY"));
        assertTrue(account.isEnabled());
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String role, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(email, role, password, password)));
    }

    private String body(String email, String role, String password, String confirmation) throws Exception {
        return mapper.writeValueAsString(Map.of("email", email, "role", role, "password", password, "confirmPassword", confirmation));
    }

    private String studentEmail() {
        return "shavali." + String.format("%02d", ThreadLocalRandom.current().nextInt(100)) + "mic"
                + String.format("%05d", ThreadLocalRandom.current().nextInt(100_000)) + "@vitapstudent.ac.in";
    }
}


