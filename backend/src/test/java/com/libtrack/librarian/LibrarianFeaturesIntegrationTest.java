package com.libtrack.librarian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.circulation.LoanRepository;

@LibTrackIntegrationTest
@Transactional
class LibrarianFeaturesIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accounts;

    @Autowired
    private LoanRepository loanRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount student;
    private UserAccount faculty;
    private UserAccount librarian;

    @BeforeEach
    void setUp() {
        librarian = accounts.save(UserAccount.initialLibrarian("head.librarian@vitap.ac.in", "hash123"));
        student = accounts.save(UserAccount.provisionMember(
            "student.test@vitapstudent.ac.in",
            "hash123",
            AccountRole.STUDENT,
            "23MIC7248",
            librarian.getId(),
            java.time.Instant.now()
        ));
        faculty = accounts.save(UserAccount.provisionMember(
            "faculty.test@vitap.ac.in",
            "hash123",
            AccountRole.FACULTY,
            "FAC-901",
            librarian.getId(),
            java.time.Instant.now()
        ));
    }

    @Test
    void librarianCanFetchDashboardStats() throws Exception {
        String bookJson = "{\"title\":\"Clean Code\",\"isbn\":\"9780132350884\",\"description\":\"Software\",\"authors\":[\"Robert C. Martin\"],\"categories\":[\"Software\"],\"circulationPolicy\":\"STANDARD\"}";
        var bookResult = mvc.perform(post("/api/v1/books")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(bookJson))
                .andExpect(status().isCreated())
                .andReturn();
        String bookId = mapper.readTree(bookResult.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(post("/api/v1/books/" + bookId + "/copies")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"copyIdentifier\":\"CC-001\",\"location\":\"Shelf 1\"}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/librarian/dashboard/stats")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBooks").isNumber())
                .andExpect(jsonPath("$.bookCopies").isNumber())
                .andExpect(jsonPath("$.activeMembers").isNumber())
                .andExpect(jsonPath("$.pendingRequests").isNumber());
    }

    @Test
    void studentCannotAccessDashboardStats() throws Exception {
        mvc.perform(get("/api/v1/librarian/dashboard/stats")
                .with(user("student.test@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void librarianCanFetchCirculationOverview() throws Exception {
        mvc.perform(get("/api/v1/librarian/dashboard/overview?months=5")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(5));
    }

    @Test
    void librarianCanFetchRecentActivity() throws Exception {
        mvc.perform(get("/api/v1/librarian/dashboard/recent-activity?limit=5")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void studentCannotAccessRecentActivity() throws Exception {
        mvc.perform(get("/api/v1/librarian/dashboard/recent-activity")
                .with(user("student.test@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void librarianCanSearchAndFilterMembers() throws Exception {
        // Query by institutional ID
        mvc.perform(get("/api/v1/librarian/members?q=23MIC7248")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].email").value("student.test@vitapstudent.ac.in"))
                .andExpect(jsonPath("$.content[0].institutionalId").value("23MIC7248"))
                .andExpect(jsonPath("$.content[0].role").value("STUDENT"));

        // Filter by role
        mvc.perform(get("/api/v1/librarian/members?role=FACULTY")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].role").value("FACULTY"));
    }

    @Test
    void librarianCanViewMemberDetails() throws Exception {
        mvc.perform(get("/api/v1/librarian/members/{id}", student.getId())
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(student.getId().toString()))
                .andExpect(jsonPath("$.email").value("student.test@vitapstudent.ac.in"))
                .andExpect(jsonPath("$.currentLoans").isArray())
                .andExpect(jsonPath("$.borrowingHistory").isArray())
                .andExpect(jsonPath("$.borrowRequests").isArray());
    }

    @Test
    void librarianCanDisableAndEnableMemberAccount() throws Exception {
        // Disable
        mvc.perform(post("/api/v1/librarian/members/{id}/disable", student.getId())
                .with(csrf())
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isNoContent());

        UserAccount reloaded = accounts.findById(student.getId()).orElseThrow();
        assertThat(reloaded.isEnabled()).isFalse();

        // Enable
        mvc.perform(post("/api/v1/librarian/members/{id}/enable", student.getId())
                .with(csrf())
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isNoContent());

        reloaded = accounts.findById(student.getId()).orElseThrow();
        assertThat(reloaded.isEnabled()).isTrue();
    }

    @Test
    void topBorrowedBooksQueryWorksAndReportsSummaryReturnsData() throws Exception {
        mvc.perform(get("/api/v1/librarian/reports/summary")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inventory").isMap())
                .andExpect(jsonPath("$.circulation").isMap())
                .andExpect(jsonPath("$.overdueLoans").isArray())
                .andExpect(jsonPath("$.topBooks").isArray());

        var topBooks = loanRepository.findTopBorrowedBooks(PageRequest.of(0, 5));
        assertThat(topBooks).isNotNull();
    }

    @Test
    void librarianCanFetchFinesPolicyAndAudit() throws Exception {
        mvc.perform(get("/api/v1/librarian/fines/policy")
                .with(user("head.librarian@vitap.ac.in").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNCONFIGURED"))
                .andExpect(jsonPath("$.monetaryFinesEnabled").value(false))
                .andExpect(jsonPath("$.overdueLoans").isArray());
    }

    @Test
    void librarianCanReadAndModifySettings() throws Exception {
        mvc.perform(get("/api/v1/librarian/settings")
                .with(user(new com.libtrack.auth.AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mvc.perform(put("/api/v1/librarian/settings/loan.period.days")
                .with(user(new com.libtrack.auth.AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":\"21\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.value").value("21"));

        mvc.perform(put("/api/v1/librarian/settings/loan.period.student.days")
                .with(user(new com.libtrack.auth.AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":\"30\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memberCanSubmitFeedbackAndLibrarianCanReview() throws Exception {
        mvc.perform(post("/api/v1/feedback")
                .with(user(new com.libtrack.auth.AccountUserDetails(student)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"category\":\"BOOK_REQUEST\",\"subject\":\"Need K&R C\",\"message\":\"Requesting copies for course\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject").value("Need K&R C"));

        mvc.perform(get("/api/v1/librarian/feedback")
                .with(user(new com.libtrack.auth.AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Need K&R C"));
    }

    @Test
    void notificationsFlowWorks() throws Exception {
        mvc.perform(post("/api/v1/librarian/notifications")
                .with(user(new com.libtrack.auth.AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Maintenance Notice\",\"message\":\"Library closes at 8pm\",\"category\":\"OPERATIONAL\",\"targetRole\":\"STUDENT\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Maintenance Notice"));

        mvc.perform(get("/api/v1/notifications/unread-count")
                .with(user(new com.libtrack.auth.AccountUserDetails(student))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").isNumber());
    }
}
