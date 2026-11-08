package com.libtrack.librarian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.ApprovalStatus;
import com.libtrack.auth.Department;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@LibTrackIntegrationTest
@Transactional
class DepartmentManagementIntegrationTest {

    @Autowired private MockMvc mvc;
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    @Autowired private UserAccountRepository accounts;
    @Autowired private PasswordEncoder encoder;

    private UserAccount librarian;
    private AccountUserDetails librarianPrincipal;
    private UserAccount student;
    private AccountUserDetails studentPrincipal;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian(
                "librarian." + UUID.randomUUID().toString().substring(0, 8) + "@libtrack.local",
                encoder.encode("LibrarianPass123!")));
        librarianPrincipal = new AccountUserDetails(librarian);

        student = UserAccount.pendingSelfRegistration(
                "student." + UUID.randomUUID().toString().substring(0, 8) + ".23mic7999@vitapstudent.ac.in",
                encoder.encode("StudentPass123!"),
                AccountRole.STUDENT,
                "Test Student",
                "23MIC7999"
        );
        student.setDepartment(Department.COMPUTER_SCIENCE_AND_ENGINEERING.getCanonicalName());
        student.approve(librarian.getId(), "Approved", java.time.Instant.now());
        student = accounts.save(student);
        studentPrincipal = new AccountUserDetails(student);
    }

    @Test
    @DisplayName("Registration requires an approved department for students")
    void testRegistrationRequiresDepartment() throws Exception {
        Map<String, Object> req = Map.of(
                "fullName", "No Dept Student",
                "institutionalId", "23MIC8001",
                "email", "nodept.23mic8001@vitapstudent.ac.in",
                "password", "StudentPass123!",
                "confirmPassword", "StudentPass123!",
                "role", "STUDENT"
        );

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.department").exists());
    }

    @Test
    @DisplayName("Registration rejects unapproved departments like IT, Civil, AIML")
    void testRegistrationRejectsInvalidDepartments() throws Exception {
        String[] invalidDepts = {"Information Technology", "Civil Engineering", "Artificial Intelligence", "Other", "Data Science"};
        for (String invalidDept : invalidDepts) {
            Map<String, Object> req = Map.of(
                    "fullName", "Invalid Dept User",
                    "institutionalId", "23MIC8002",
                    "email", "invalid.23mic8002@vitapstudent.ac.in",
                    "password", "StudentPass123!",
                    "confirmPassword", "StudentPass123!",
                    "role", "STUDENT",
                    "department", invalidDept
            );

            mvc.perform(post("/api/v1/auth/register")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.department").exists());
        }
    }

    @Test
    @DisplayName("Registration succeeds for all 4 official departments")
    void testRegistrationSucceedsForAllOfficialDepartments() throws Exception {
        String[] depts = {
                "Computer Science and Engineering",
                "Electronics and Communication Engineering",
                "Electrical and Electronics Engineering",
                "Mechanical Engineering"
        };

        String[] suffixes = {"cse", "ece", "eee", "me"};
        int idx = 0;
        for (String dept : depts) {
            String suffix = suffixes[idx];
            idx++;
            String email = "student" + suffix + ".23mic80" + (10 + idx) + "@vitapstudent.ac.in";
            Map<String, Object> req = Map.of(
                    "fullName", "Student " + dept,
                    "institutionalId", "23MIC80" + (10 + idx),
                    "email", email,
                    "password", "StudentPass123!",
                    "confirmPassword", "StudentPass123!",
                    "role", "STUDENT",
                    "department", dept
            );

            mvc.perform(post("/api/v1/auth/register")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(req)))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

            UserAccount registered = accounts.findByEmail(email).orElseThrow();
            assertThat(registered.getDepartment()).isEqualTo(dept);
        }
    }

    @Test
    @DisplayName("/api/v1/auth/me returns department")
    void testCurrentUserReturnsDepartment() throws Exception {
        mvc.perform(get("/api/v1/auth/me")
                        .with(user(studentPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering"));
    }

    @Test
    @DisplayName("Librarian can update member department")
    void testLibrarianCanUpdateMemberDepartment() throws Exception {
        mvc.perform(post("/api/v1/librarian/members/{id}/department", student.getId())
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("department", "Mechanical Engineering"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Mechanical Engineering"));

        UserAccount updated = accounts.findById(student.getId()).orElseThrow();
        assertThat(updated.getDepartment()).isEqualTo("Mechanical Engineering");
    }

    @Test
    @DisplayName("Updating member department rejects invalid department")
    void testUpdateDepartmentRejectsInvalidValue() throws Exception {
        mvc.perform(post("/api/v1/librarian/members/{id}/department", student.getId())
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("department", "Aerospace Engineering"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_ARGUMENT"));
    }

    @Test
    @DisplayName("Non-librarian cannot update member department")
    void testNonLibrarianCannotUpdateDepartment() throws Exception {
        mvc.perform(post("/api/v1/librarian/members/{id}/department", student.getId())
                        .with(csrf())
                        .with(user(studentPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("department", "Mechanical Engineering"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Librarian member directory filters by department")
    void testMemberDirectoryFiltersByDepartment() throws Exception {
        // Create an ECE student
        UserAccount eceStudent = UserAccount.pendingSelfRegistration(
                "ece." + UUID.randomUUID().toString().substring(0, 8) + ".23mic8099@vitapstudent.ac.in",
                encoder.encode("StudentPass123!"),
                AccountRole.STUDENT,
                "ECE Student",
                "23MIC8099"
        );
        eceStudent.setDepartment("Electronics and Communication Engineering");
        eceStudent.approve(librarian.getId(), "Approved", java.time.Instant.now());
        accounts.save(eceStudent);

        // Filter by ECE
        mvc.perform(get("/api/v1/librarian/members")
                        .with(user(librarianPrincipal))
                        .param("department", "Electronics and Communication Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].department").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Electronics and Communication Engineering"))));

        // Filter by CSE
        mvc.perform(get("/api/v1/librarian/members")
                        .with(user(librarianPrincipal))
                        .param("department", "Computer Science and Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].department").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Computer Science and Engineering"))));
    }
}
