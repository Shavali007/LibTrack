package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import com.libtrack.LibTrackIntegrationTest;
import org.springframework.test.web.servlet.MvcResult;

@LibTrackIntegrationTest
class AuthenticationAndProvisioningIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";
    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired LibrarianBootstrapService bootstrapService;
    ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;

    @BeforeEach void setup() {
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-" + UUID.randomUUID() + "@example.edu", encoder.encode(PASSWORD)));
    }

    @Test void successfulLoginHashAndSafeCurrentUser() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MvcResult login = login(student);
        assertEquals(200, login.getResponse().getStatus());
        assertTrue(encoder.matches(PASSWORD, student.getPasswordHash()));
        assertNotEquals(PASSWORD, student.getPasswordHash());
        JsonNode profile = mapper.readTree(login.getResponse().getContentAsString());
        assertEquals("STUDENT", profile.get("role").asText());
        assertFalse(login.getResponse().getContentAsString().contains("passwordHash"));
        assertEquals(200, mvc.perform(get("/api/v1/auth/me").session((MockHttpSession) login.getRequest().getSession())).andReturn().getResponse().getStatus());
    }

    @Test void invalidCredentialsAndDisabledAccountsAreGenericUnauthorized() throws Exception {
        member(AccountRole.STUDENT);
        assertEquals(401, mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "absent@example.edu", "password", PASSWORD)))).andReturn().getResponse().getStatus());
        UserAccount disabled = member(AccountRole.FACULTY); disabled.deactivate(); accounts.saveAndFlush(disabled);
        assertEquals(401, mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", disabled.getEmail(), "password", PASSWORD)))).andReturn().getResponse().getStatus());
    }

    @Test void currentUserRequiresLoginAndLogoutInvalidatesSession() throws Exception {
        assertEquals(401, mvc.perform(get("/api/v1/auth/me")).andReturn().getResponse().getStatus());
        MvcResult login = login(member(AccountRole.FACULTY));
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession();
        assertEquals(200, mvc.perform(get("/api/v1/auth/me").session(session)).andReturn().getResponse().getStatus());
        MvcResult logout = mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}")).andReturn();
        assertEquals(204, logout.getResponse().getStatus());
        assertTrue(session.isInvalid());
        assertEquals(401, mvc.perform(get("/api/v1/auth/me").session(session)).andReturn().getResponse().getStatus());
    }

    @Test void initialLibrarianBootstrapIsOneTimeOnly() {
        assertThrows(IllegalStateException.class, () -> bootstrapService.createInitialLibrarian("second@example.edu", PASSWORD));
    }

    @Test void csrfIsRequiredForStateChangingAuthenticationRequests() throws Exception {
        assertEquals(403, mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "x@example.edu", "password", PASSWORD)))).andReturn().getResponse().getStatus());
    }

    @Test void studentFacultyLibrarianPermissionsAndRoleAllowlist() throws Exception {
        UserAccount student = member(AccountRole.STUDENT), faculty = member(AccountRole.FACULTY);
        MockHttpSession studentSession = session(login(student));
        MockHttpSession facultySession = session(login(faculty));
        MockHttpSession librarianSession = session(login(librarian));
        String body = provisionBody("student-" + UUID.randomUUID());
        assertEquals(401, postProvision(null, body).getResponse().getStatus());
        assertEquals(403, postProvision(studentSession, body).getResponse().getStatus());
        assertEquals(403, postProvision(facultySession, body).getResponse().getStatus());
        MvcResult created = postProvision(librarianSession, body);
        assertEquals(201, created.getResponse().getStatus());
        assertFalse(created.getResponse().getContentAsString().toLowerCase().contains("password"));
        assertEquals(400, postProvision(librarianSession, body.replace("STUDENT", "LIBRARIAN")).getResponse().getStatus());
    }

    @Test void duplicateEmailAndInstitutionalIdConflict() throws Exception {
        MockHttpSession session = session(login(librarian));
        String id = "DUP-" + UUID.randomUUID();
        String email = "same-" + UUID.randomUUID() + "@example.edu";
        assertEquals(201, postProvision(session, requestJson(email, id, "STUDENT")).getResponse().getStatus());
        assertEquals(409, postProvision(session, requestJson(email.toUpperCase(), "OTHER-" + id, "FACULTY")).getResponse().getStatus());
        assertEquals(409, postProvision(session, requestJson("other-" + UUID.randomUUID() + "@example.edu", id, "FACULTY")).getResponse().getStatus());
    }

    @Test void unverifiedProvisioningRejectedAndSensitiveDtosRedactPasswords() throws Exception {
        MockHttpSession session = session(login(librarian));
        String body = json(Map.of("email", "unverified-" + UUID.randomUUID() + "@example.edu", "institutionalId", "ID-1", "password", PASSWORD, "role", "STUDENT", "identityVerified", false));
        assertEquals(400, postProvision(session, body).getResponse().getStatus());
        assertFalse(new LoginRequest("x@example.edu", PASSWORD).toString().contains(PASSWORD));
        assertFalse(new ProvisionAccountRequest("x@example.edu", "id", PASSWORD, ProvisionableRole.STUDENT, true).toString().contains(PASSWORD));
    }

    private UserAccount member(AccountRole role) {
        return accounts.saveAndFlush(UserAccount.provisionMember(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.edu", encoder.encode(PASSWORD), role,
                role.name() + "-" + UUID.randomUUID(), librarian.getId(), Instant.now()));
    }
    private MvcResult login(UserAccount account) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", account.getEmail(), "password", PASSWORD)))).andReturn();
    }
    private MockHttpSession session(MvcResult result) { return (MockHttpSession) result.getRequest().getSession(); }
    private MvcResult postProvision(MockHttpSession session, String body) throws Exception {
        var request = post("/api/v1/librarian/accounts").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body);
        if (session != null) request.session(session);
        return mvc.perform(request).andReturn();
    }
    private String provisionBody(String suffix) throws Exception { return requestJson(suffix + "@example.edu", suffix, "STUDENT"); }
    private String requestJson(String email, String id, String role) throws Exception {
        return json(Map.of("email", email, "institutionalId", id, "password", PASSWORD, "role", role, "identityVerified", true));
    }
    private String json(Object value) throws Exception { return mapper.writeValueAsString(value); }
}


