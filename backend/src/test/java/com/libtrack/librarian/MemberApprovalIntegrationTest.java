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
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@LibTrackIntegrationTest
@Transactional
class MemberApprovalIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private MemberApprovalAuditRepository auditRepository;

    @Autowired
    private PasswordEncoder encoder;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;
    private AccountUserDetails librarianPrincipal;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian(
                "librarian." + UUID.randomUUID().toString().substring(0, 8) + "@libtrack.local",
                encoder.encode("LibrarianPass123!")));
        librarianPrincipal = new AccountUserDetails(librarian);
    }

    @Test
    @DisplayName("1. Student registration creates pending account with fullName and institutionalId")
    void testStudentRegistration() throws Exception {
        Map<String, Object> req = Map.of(
                "fullName", "Rahul Kumar",
                "institutionalId", "23MIC7210",
                "email", "rahul.23mic7210@vitapstudent.ac.in",
                "password", "StudentPass123!",
                "confirmPassword", "StudentPass123!",
                "role", "STUDENT",
                "department", "Computer Science and Engineering"
        );

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.message").value("Your registration has been submitted successfully. Your account is awaiting librarian verification. You will be able to sign in once your account is approved."));

        UserAccount saved = accounts.findByEmail("rahul.23mic7210@vitapstudent.ac.in").orElseThrow();
        assertThat(saved.getDisplayName()).isEqualTo("Rahul Kumar");
        assertThat(saved.getInstitutionalId()).isEqualTo("23MIC7210");
        assertThat(saved.getDepartment()).isEqualTo("Computer Science and Engineering");
        assertThat(saved.getApprovalStatus()).isEqualTo(ApprovalStatus.PENDING_APPROVAL);
        assertThat(saved.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("2. Faculty registration creates pending account")
    void testFacultyRegistration() throws Exception {
        Map<String, Object> req = Map.of(
                "fullName", "Dr. Arjun Reddy",
                "institutionalId", "23MFC1001",
                "email", "arjun.reddy@vitap.ac.in",
                "password", "FacultyPass123!",
                "confirmPassword", "FacultyPass123!",
                "role", "FACULTY",
                "department", "Electronics and Communication Engineering"
        );

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        UserAccount saved = accounts.findByEmail("arjun.reddy@vitap.ac.in").orElseThrow();
        assertThat(saved.getDisplayName()).isEqualTo("Dr. Arjun Reddy");
        assertThat(saved.getInstitutionalId()).isNull();
        assertThat(saved.getDepartment()).isEqualTo("Electronics and Communication Engineering");
        assertThat(saved.getApprovalStatus()).isEqualTo(ApprovalStatus.PENDING_APPROVAL);
        assertThat(saved.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("3. Registration fails on duplicate email")
    void testDuplicateEmailFails() throws Exception {
        accounts.save(UserAccount.pendingSelfRegistration(
                "priya.23mic7211@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "Priya Sharma",
                "23MIC7211"
        ));

        Map<String, Object> req = Map.of(
                "fullName", "Priya Sharma",
                "institutionalId", "23MIC9999",
                "email", "priya.23mic7211@vitapstudent.ac.in",
                "password", "StudentPass123!",
                "confirmPassword", "StudentPass123!",
                "role", "STUDENT",
                "department", "Mechanical Engineering"
        );

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("4. Registration fails on duplicate institutional ID")
    void testDuplicateInstitutionalIdFails() throws Exception {
        accounts.save(UserAccount.pendingSelfRegistration(
                "priya.23mic7211@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "Priya Sharma",
                "23MIC7211"
        ));

        Map<String, Object> req = Map.of(
                "fullName", "Different Name",
                "institutionalId", "23MIC7211",
                "email", "different.23mic7211@vitapstudent.ac.in",
                "password", "StudentPass123!",
                "confirmPassword", "StudentPass123!",
                "role", "STUDENT",
                "department", "Electrical and Electronics Engineering"
        );

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("5. Pending account cannot login and receives ACCOUNT_PENDING_APPROVAL error")
    void testPendingAccountCannotLogin() throws Exception {
        accounts.save(UserAccount.pendingSelfRegistration(
                "pending.23mic7000@vitapstudent.ac.in",
                encoder.encode("SecurePass123!"),
                AccountRole.STUDENT,
                "Pending User",
                "23MIC7000"
        ));

        Map<String, Object> loginReq = Map.of(
                "email", "pending.23mic7000@vitapstudent.ac.in",
                "password", "SecurePass123!"
        );

        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_PENDING_APPROVAL"))
                .andExpect(jsonPath("$.message").value("Your account registration is awaiting librarian approval. You will be able to sign in once approved."));
    }

    @Test
    @DisplayName("6. Rejected account cannot login and receives ACCOUNT_REJECTED error")
    void testRejectedAccountCannotLogin() throws Exception {
        UserAccount rejected = UserAccount.pendingSelfRegistration(
                "rejected.23mic7001@vitapstudent.ac.in",
                encoder.encode("SecurePass123!"),
                AccountRole.STUDENT,
                "Rejected User",
                "23MIC7001"
        );
        rejected.reject(librarian.getId(), "Information mismatch", "ID does not match records", java.time.Instant.now());
        accounts.save(rejected);

        Map<String, Object> loginReq = Map.of(
                "email", "rejected.23mic7001@vitapstudent.ac.in",
                "password", "SecurePass123!"
        );

        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_REJECTED"))
                .andExpect(jsonPath("$.message").value("Your account registration request has been rejected. Please contact library staff for assistance."));
    }

    @Test
    @DisplayName("Generic member enable cannot activate pending or rejected registrations")
    void genericEnableCannotActivateUnapprovedAccounts() throws Exception {
        UserAccount pending = accounts.saveAndFlush(UserAccount.pendingSelfRegistration(
                "pending.enable." + UUID.randomUUID() + "@vitapstudent.ac.in",
                encoder.encode("SecurePass1!"), AccountRole.STUDENT, "Pending Member", "PEN" + UUID.randomUUID()));
        UserAccount rejected = UserAccount.pendingSelfRegistration(
                "rejected.enable." + UUID.randomUUID() + "@vitap.ac.in",
                encoder.encode("SecurePass1!"), AccountRole.FACULTY, "Rejected Member", "REJ" + UUID.randomUUID());
        rejected.reject(librarian.getId(), "Identity mismatch", null, java.time.Instant.now());
        rejected = accounts.saveAndFlush(rejected);

        mvc.perform(post("/api/v1/librarian/members/{id}/enable", pending.getId())
                        .with(csrf()).with(user(librarianPrincipal)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_STATE"));
        mvc.perform(post("/api/v1/librarian/members/{id}/enable", rejected.getId())
                        .with(csrf()).with(user(librarianPrincipal)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_STATE"));

        UserAccount pendingAfter = accounts.findById(pending.getId()).orElseThrow();
        UserAccount rejectedAfter = accounts.findById(rejected.getId()).orElseThrow();
        assertThat(pendingAfter.isEnabled()).isFalse();
        assertThat(pendingAfter.getApprovalStatus()).isEqualTo(ApprovalStatus.PENDING_APPROVAL);
        assertThat(rejectedAfter.isEnabled()).isFalse();
        assertThat(rejectedAfter.getApprovalStatus()).isEqualTo(ApprovalStatus.REJECTED);
    }

    @Test
    @DisplayName("7. Disabled approved account cannot login and receives ACCOUNT_NOT_ACTIVE error")
    void testDisabledApprovedAccountCannotLogin() throws Exception {
        UserAccount member = UserAccount.provisionMember(
                "disabled.23mic7002@vitapstudent.ac.in",
                encoder.encode("SecurePass123!"),
                AccountRole.STUDENT,
                "23MIC7002",
                librarian.getId(),
                java.time.Instant.now(),
                "Disabled Member"
        );
        member.deactivate();
        accounts.save(member);

        Map<String, Object> loginReq = Map.of(
                "email", "disabled.23mic7002@vitapstudent.ac.in",
                "password", "SecurePass123!"
        );

        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("8. Member requests counts endpoint returns live counts")
    void testGetCounts() throws Exception {
        long initialPending = accounts.countByApprovalStatusForMembers(ApprovalStatus.PENDING_APPROVAL);
        long initialApproved = accounts.countByApprovalStatusForMembers(ApprovalStatus.APPROVED);
        long initialRejected = accounts.countByApprovalStatusForMembers(ApprovalStatus.REJECTED);

        accounts.save(UserAccount.pendingSelfRegistration("p1.23mic7011@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "P1", "23MIC7011"));
        accounts.save(UserAccount.pendingSelfRegistration("p2.23mic7012@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "P2", "23MIC7012"));

        UserAccount rejected = UserAccount.pendingSelfRegistration("r1.23mic7013@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "R1", "23MIC7013");
        rejected.reject(librarian.getId(), "Invalid details", null, java.time.Instant.now());
        accounts.save(rejected);

        accounts.save(UserAccount.provisionMember("a1.23mic7014@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "23MIC7014", librarian.getId(), java.time.Instant.now(), "A1"));

        mvc.perform(get("/api/v1/librarian/member-requests/counts")
                        .with(user(librarianPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pending").value(initialPending + 2))
                .andExpect(jsonPath("$.rejected").value(initialRejected + 1))
                .andExpect(jsonPath("$.approved").value(initialApproved + 1));
    }

    @Test
    @DisplayName("9. List member requests with status filter")
    void testListMemberRequestsWithStatusFilter() throws Exception {
        accounts.save(UserAccount.pendingSelfRegistration("p.23mic7021@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "P", "23MIC7021"));

        UserAccount rejected = UserAccount.pendingSelfRegistration("r.23mic7022@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "R", "23MIC7022");
        rejected.reject(librarian.getId(), "Other", "Reason", java.time.Instant.now());
        accounts.save(rejected);

        mvc.perform(get("/api/v1/librarian/member-requests")
                        .param("status", "PENDING_APPROVAL")
                        .with(user(librarianPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("p.23mic7021@vitapstudent.ac.in"));
    }

    @Test
    @DisplayName("10. List member requests with search query")
    void testListMemberRequestsSearch() throws Exception {
        accounts.save(UserAccount.pendingSelfRegistration("rahul.23mic7031@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "Rahul Kumar", "23MIC7031"));
        accounts.save(UserAccount.pendingSelfRegistration("priya.23mic7032@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "Priya Sharma", "23MIC7032"));

        mvc.perform(get("/api/v1/librarian/member-requests")
                        .param("q", "Rahul")
                        .with(user(librarianPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].fullName").value("Rahul Kumar"));
    }

    @Test
    @DisplayName("11. List member requests with role filter")
    void testListMemberRequestsRoleFilter() throws Exception {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        accounts.save(UserAccount.pendingSelfRegistration("student." + uniqueSuffix + "@vitapstudent.ac.in", encoder.encode("P!"), AccountRole.STUDENT, "Student User " + uniqueSuffix, "STU" + uniqueSuffix));
        accounts.save(UserAccount.pendingSelfRegistration("faculty." + uniqueSuffix + "@vitap.ac.in", encoder.encode("P!"), AccountRole.FACULTY, "Faculty User " + uniqueSuffix, "FAC" + uniqueSuffix));

        mvc.perform(get("/api/v1/librarian/member-requests")
                        .param("role", "FACULTY")
                        .param("q", uniqueSuffix)
                        .with(user(librarianPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].email").value("faculty." + uniqueSuffix + "@vitap.ac.in"));
    }

    @Test
    @DisplayName("12. Get member request details by ID")
    void testGetMemberRequestDetails() throws Exception {
        UserAccount pending = accounts.save(UserAccount.pendingSelfRegistration(
                "rahul.23mic7051@vitapstudent.ac.in",
                encoder.encode("P!"),
                AccountRole.STUDENT,
                "Rahul Kumar",
                "23MIC7051"
        ));

        mvc.perform(get("/api/v1/librarian/member-requests/" + pending.getId())
                        .with(user(librarianPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(pending.getId().toString()))
                .andExpect(jsonPath("$.fullName").value("Rahul Kumar"))
                .andExpect(jsonPath("$.institutionalId").value("23MIC7051"))
                .andExpect(jsonPath("$.email").value("rahul.23mic7051@vitapstudent.ac.in"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.approvalStatus").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("13. Approve member request enables account and records audit")
    void testApproveMemberRequest() throws Exception {
        UserAccount pending = accounts.save(UserAccount.pendingSelfRegistration(
                "rahul.23mic7061@vitapstudent.ac.in",
                encoder.encode("RahulPass123!"),
                AccountRole.STUDENT,
                "Rahul Kumar",
                "23MIC7061"
        ));

        Map<String, Object> req = Map.of("remarks", "Verified with college ID card");

        mvc.perform(post("/api/v1/librarian/member-requests/" + pending.getId() + "/approve")
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"))
                .andExpect(jsonPath("$.librarianRemarks").value("Verified with college ID card"))
                .andExpect(jsonPath("$.auditHistory[0].decision").value("APPROVED"));

        UserAccount updated = accounts.findById(pending.getId()).orElseThrow();
        assertThat(updated.getApprovalStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(updated.isEnabled()).isTrue();
        assertThat(updated.getReviewedByAccountId()).isEqualTo(librarian.getId());
        assertThat(updated.getLibrarianRemarks()).isEqualTo("Verified with college ID card");

        var audits = auditRepository.findByAccountIdOrderByReviewedAtDesc(pending.getId());
        assertThat(audits).hasSize(1);
        assertThat(audits.get(0).getDecision()).isEqualTo("APPROVED");
        assertThat(audits.get(0).getReviewedByAccountId()).isEqualTo(librarian.getId());

        // 14. Approved account can now log in
        Map<String, Object> loginReq = Map.of(
                "email", "rahul.23mic7061@vitapstudent.ac.in",
                "password", "RahulPass123!"
        );
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("rahul.23mic7061@vitapstudent.ac.in"))
                .andExpect(jsonPath("$.displayName").value("Rahul Kumar"));
    }

    @Test
    @DisplayName("15. Reject member request sets REJECTED status, disables account, and records reason")
    void testRejectMemberRequest() throws Exception {
        UserAccount pending = accounts.save(UserAccount.pendingSelfRegistration(
                "bad.23mic7071@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "Bad Applicant",
                "23MIC7071"
        ));

        Map<String, Object> req = Map.of(
                "reason", "Information mismatch (ID / email)",
                "remarks", "The provided institutional ID does not match our records."
        );

        mvc.perform(post("/api/v1/librarian/member-requests/" + pending.getId() + "/reject")
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Information mismatch (ID / email)"))
                .andExpect(jsonPath("$.librarianRemarks").value("The provided institutional ID does not match our records."))
                .andExpect(jsonPath("$.auditHistory[0].decision").value("REJECTED"));

        UserAccount updated = accounts.findById(pending.getId()).orElseThrow();
        assertThat(updated.getApprovalStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(updated.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("16. Rejecting without a reason fails")
    void testRejectWithoutReasonFails() throws Exception {
        UserAccount pending = accounts.save(UserAccount.pendingSelfRegistration(
                "pending.23mic7081@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "Applicant",
                "23MIC7081"
        ));

        Map<String, Object> req = Map.of("reason", "");

        mvc.perform(post("/api/v1/librarian/member-requests/" + pending.getId() + "/reject")
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("17. Cannot approve an already approved account")
    void testCannotApproveAlreadyApproved() throws Exception {
        UserAccount pending = accounts.save(UserAccount.pendingSelfRegistration(
                "applicant.23mic7091@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "Applicant",
                "23MIC7091"
        ));

        pending.approve(librarian.getId(), "Approved first", java.time.Instant.now());
        accounts.save(pending);

        mvc.perform(post("/api/v1/librarian/member-requests/" + pending.getId() + "/approve")
                        .with(csrf())
                        .with(user(librarianPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("remarks", "Try again"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_STATE"));
    }

    @Test
    @DisplayName("18. Non-librarians cannot access member-requests endpoints")
    void testNonLibrarianForbidden() throws Exception {
        UserAccount student = accounts.save(UserAccount.provisionMember(
                "student.auth@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "23MIC9998",
                librarian.getId(),
                java.time.Instant.now(),
                "Student Auth"
        ));
        AccountUserDetails studentPrincipal = new AccountUserDetails(student);

        mvc.perform(get("/api/v1/librarian/member-requests")
                        .with(user(studentPrincipal)))
                .andExpect(status().isForbidden());
    }
}
