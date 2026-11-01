package com.libtrack.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;

@LibTrackIntegrationTest
@Transactional
class DisplayNameGenerationIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private DisplayNameGenerationService nameService;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private PasswordEncoder encoder;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian(
                "librarian." + UUID.randomUUID().toString().substring(0, 8) + "@libtrack.local",
                encoder.encode("LibrarianPass123!")));
    }

    // 1. Normal student institutional email
    @Test
    @DisplayName("1. Normal student institutional email extracts and capitalizes name")
    void testNormalStudentEmail() {
        String name = nameService.generateDisplayName("shavali.23mic7248@vitapstudent.ac.in");
        assertEquals("Shavali", name);

        assertEquals("Rahul", nameService.generateDisplayName("rahul.23bce1234@vitapstudent.ac.in"));
        assertEquals("Priya", nameService.generateDisplayName("priya.23bce1235@vitapstudent.ac.in"));
        assertEquals("John", nameService.generateDisplayName("john.23mic1234@vitapstudent.ac.in"));
        assertEquals("Naveen", nameService.generateDisplayName("naveen.23bce1236@vitapstudent.ac.in"));
    }

    // 2. Normal faculty institutional email
    @Test
    @DisplayName("2. Normal faculty institutional email extracts and capitalizes name")
    void testNormalFacultyEmail() {
        String name = nameService.generateDisplayName("smith.prof@vitap.ac.in");
        assertEquals("Smith", name);

        assertEquals("Anand", nameService.generateDisplayName("anand.k@vitap.ac.in"));
    }

    // 3. Uppercase email username
    @Test
    @DisplayName("3. Uppercase email username is converted with first letter upper and rest lowercase")
    void testUppercaseEmailUsername() {
        String name = nameService.generateDisplayName("RAHUL.23BCE1234@VITAPSTUDENT.AC.IN");
        assertEquals("Rahul", name);

        assertEquals("Shavali", nameService.generateDisplayName("SHAVALI.23MIC7248@VITAPSTUDENT.AC.IN"));
    }

    // 4. Missing period in the email username
    @Test
    @DisplayName("4. Missing period in username uses entire portion before @")
    void testMissingPeriodInEmailUsername() {
        String name = nameService.generateDisplayName("naveen@vitapstudent.ac.in");
        assertEquals("Naveen", name);

        assertEquals("Admin", nameService.generateDisplayName("admin@libtrack.org"));
    }

    // 5. Empty or malformed email
    @Test
    @DisplayName("5. Empty or malformed email returns safe fallback without failing")
    void testEmptyOrMalformedEmail() {
        assertEquals("Member", nameService.generateDisplayName(null));
        assertEquals("Member", nameService.generateDisplayName(""));
        assertEquals("Member", nameService.generateDisplayName("   "));
        assertEquals("Member", nameService.generateDisplayName("@vitapstudent.ac.in"));
        assertEquals("Member", nameService.generateDisplayName(".dotstart@vitapstudent.ac.in"));
        assertEquals("Member", nameService.generateDisplayName("  @invalid  "));
    }

    // 6. Existing custom display name preservation
    @Test
    @DisplayName("6. Existing custom display name is preserved")
    void testExistingCustomDisplayNamePreservation() {
        UserAccount account = UserAccount.provisionMember(
                "custom.user@vitap.ac.in",
                encoder.encode("Pass12345678!"),
                AccountRole.STUDENT,
                "ID_CUSTOM_01",
                librarian.getId(),
                Instant.now(),
                "CustomNickName"
        );
        UserAccount saved = accounts.saveAndFlush(account);
        assertEquals("CustomNickName", saved.getDisplayName());

        // Reload from database
        UserAccount reloaded = accounts.findById(saved.getId()).orElseThrow();
        assertEquals("CustomNickName", reloaded.getDisplayName());
    }

    // 7. Registration-generated display name
    @Test
    @DisplayName("7. Registration automatically generates and saves display name")
    void testRegistrationGeneratesDisplayName() throws Exception {
        String studentEmail = "priya.24bce9999@vitapstudent.ac.in";
        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", studentEmail,
                                "role", "STUDENT",
                                "password", "SecurePass1!",
                                "confirmPassword", "SecurePass1!"
                        ))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        UserAccount registered = accounts.findByEmail(studentEmail).orElseThrow();
        assertEquals("Priya", registered.getDisplayName());
    }

    // 8. Librarian-provisioned account display name
    @Test
    @DisplayName("8. Librarian provisioning supports both auto-generated and custom display names")
    void testLibrarianProvisionedAccountDisplayName() throws Exception {
        // Case A: Custom display name provided by librarian
        mvc.perform(post("/api/v1/librarian/accounts")
                        .with(csrf())
                        .with(user(new AccountUserDetails(librarian)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "john.23mic1234@vitapstudent.ac.in",
                                "institutionalId", "23MIC1234",
                                "password", "TemporaryPass12!",
                                "role", "STUDENT",
                                "identityVerified", true,
                                "displayName", "Johnny"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName").value("Johnny"));

        UserAccount userA = accounts.findByEmail("john.23mic1234@vitapstudent.ac.in").orElseThrow();
        assertEquals("Johnny", userA.getDisplayName());

        // Case B: Display name omitted by librarian -> auto-generated
        mvc.perform(post("/api/v1/librarian/accounts")
                        .with(csrf())
                        .with(user(new AccountUserDetails(librarian)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "rahul.23bce1234@vitapstudent.ac.in",
                                "institutionalId", "23BCE1234",
                                "password", "TemporaryPass12!",
                                "role", "STUDENT",
                                "identityVerified", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName").value("Rahul"));

        UserAccount userB = accounts.findByEmail("rahul.23bce1234@vitapstudent.ac.in").orElseThrow();
        assertEquals("Rahul", userB.getDisplayName());
    }

    // 9. Profile display-name editing and authorization
    @Test
    @DisplayName("9. Profile display-name editing allows self-update, enforces non-empty, and prevents unauthorized changes")
    void testProfileDisplayNameEditingAndAuthorization() throws Exception {
        UserAccount student = accounts.save(UserAccount.provisionMember(
                "shavali.23mic7248@vitapstudent.ac.in",
                encoder.encode("Pass12345678!"),
                AccountRole.STUDENT,
                "23MIC7248",
                librarian.getId(),
                Instant.now(),
                "Shavali"
        ));

        // Unauthenticated request is rejected
        mvc.perform(patch("/api/v1/auth/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("displayName", "Shavali Updated"))))
                .andExpect(status().isUnauthorized());

        // Authenticated student updates their own display name
        mvc.perform(patch("/api/v1/auth/profile")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("displayName", "  Shavali New  "))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Shavali New"))
                .andExpect(jsonPath("$.email").value("shavali.23mic7248@vitapstudent.ac.in"))
                .andExpect(jsonPath("$.role").value("STUDENT"));

        // Blank/empty display name is rejected
        mvc.perform(patch("/api/v1/auth/profile")
                        .with(csrf())
                        .with(user(new AccountUserDetails(student)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("displayName", "   "))))
                .andExpect(status().isBadRequest());

        // Database verified: display name updated to trimmed version, email and role unchanged
        UserAccount updated = accounts.findById(student.getId()).orElseThrow();
        assertEquals("Shavali New", updated.getDisplayName());
        assertEquals("shavali.23mic7248@vitapstudent.ac.in", updated.getEmail());
        assertEquals(AccountRole.STUDENT, updated.getRole());
    }

    // 10. Member directory displaying the correct name
    @Test
    @DisplayName("10. Member directory summary and details return the correct display name")
    void testMemberDirectoryDisplayNames() throws Exception {
        UserAccount student = accounts.save(UserAccount.provisionMember(
                "naveen.23bce1236@vitapstudent.ac.in",
                encoder.encode("Pass12345678!"),
                AccountRole.STUDENT,
                "23BCE1236",
                librarian.getId(),
                Instant.now(),
                "Naveen"
        ));

        // List endpoint returns displayName
        mvc.perform(get("/api/v1/librarian/members?q=Naveen")
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].displayName").value("Naveen"))
                .andExpect(jsonPath("$.content[0].email").value("naveen.23bce1236@vitapstudent.ac.in"));

        // Details endpoint returns displayName
        mvc.perform(get("/api/v1/librarian/members/" + student.getId())
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Naveen"))
                .andExpect(jsonPath("$.email").value("naveen.23bce1236@vitapstudent.ac.in"));
    }
}
