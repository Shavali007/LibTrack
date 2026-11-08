package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.settings.SystemSetting;
import com.libtrack.settings.SystemSettingRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@LibTrackIntegrationTest
class BorrowingLimitAndDuplicateRestrictionIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired LoanRepository loans;
    @Autowired BorrowRequestRepository requests;
    @Autowired SystemSettingRepository settings;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession lib;

    @BeforeEach
    void setup() throws Exception {
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-" + t + "@example.edu", encoder.encode(PASSWORD)));
        lib = login(librarian);

        // Ensure max active limits are 5 for both roles
        updateSetting("loan.max.active.student", "5");
        updateSetting("loan.max.active.faculty", "5");
    }

    private void updateSetting(String key, String value) {
        SystemSetting setting = settings.findById(key)
                .orElseGet(() -> new SystemSetting(key, value, Instant.now(), librarian));
        setting.update(value, Instant.now(), librarian);
        settings.saveAndFlush(setting);
    }

    @Test
    void studentCanBorrowUpToFiveBooksAndSixthIsRejected() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        // Issue 5 different books to the student
        List<String> issuedBookIds = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            String b = book(CirculationPolicy.STANDARD);
            String c = copy(b);
            String r = submit(studentSession, b);
            approve(r);
            MvcResult res = issue(r, c);
            assertEquals(201, res.getResponse().getStatus(), "Book " + i + " should be issued successfully");
            issuedBookIds.add(b);
        }

        // Verify active loans count is 5
        assertEquals(5, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE));

        // 6th book submission by student is rejected with 409 Conflict
        String book6 = book(CirculationPolicy.STANDARD);
        MvcResult submit6 = httpPost(studentSession, "/api/v1/borrow-requests", Map.of("bookId", book6));
        assertEquals(409, submit6.getResponse().getStatus());
        JsonNode submitError = json(submit6);
        assertTrue(submitError.get("message").asText().contains("maximum borrowing limit of 5"),
                "Expected borrowing limit message, got: " + submitError.get("message").asText());

        // Even if a request was submitted before reaching limit, librarian issuing 6th book is rejected
        // Temporarily reset setting to 6 to submit request, then revert to 5 to test issue enforcement
        updateSetting("loan.max.active.student", "6");
        String r6 = submit(studentSession, book6);
        approve(r6);
        updateSetting("loan.max.active.student", "5");

        String copy6 = copy(book6);
        MvcResult issue6 = issue(r6, copy6);
        assertEquals(409, issue6.getResponse().getStatus());
        JsonNode issueError = json(issue6);
        assertTrue(issueError.get("message").asText().contains("maximum borrowing limit of 5"),
                "Expected issue rejection due to limit, got: " + issueError.get("message").asText());
    }

    @Test
    void facultyMemberCanBorrowUpToFiveBooksAndSixthIsRejected() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);

        // Issue 5 different books to the faculty
        for (int i = 1; i <= 5; i++) {
            String b = book(CirculationPolicy.STANDARD);
            String c = copy(b);
            String r = submit(facultySession, b);
            approve(r);
            MvcResult res = issue(r, c);
            assertEquals(201, res.getResponse().getStatus());
        }

        assertEquals(5, loans.countByBorrower_IdAndStatus(faculty.getId(), LoanStatus.ACTIVE));

        // 6th book request rejected
        String book6 = book(CirculationPolicy.STANDARD);
        MvcResult submit6 = httpPost(facultySession, "/api/v1/borrow-requests", Map.of("bookId", book6));
        assertEquals(409, submit6.getResponse().getStatus());
        assertTrue(json(submit6).get("message").asText().contains("maximum borrowing limit of 5"));
    }

    @Test
    void returningBookUpdatesActiveBorrowingCountAndAllowsNewLoan() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String firstLoanId = null;
        for (int i = 1; i <= 5; i++) {
            String b = book(CirculationPolicy.STANDARD);
            String c = copy(b);
            String r = submit(studentSession, b);
            approve(r);
            MvcResult res = issue(r, c);
            if (i == 1) {
                firstLoanId = json(res).get("id").asText();
            }
        }

        assertEquals(5, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE));

        // Return first book
        MvcResult returnRes = httpPost(lib, "/api/v1/loans/" + firstLoanId + "/return", Map.of("condition", "GOOD"));
        assertEquals(200, returnRes.getResponse().getStatus());

        // Active loans count is now 4
        assertEquals(4, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE));

        // Student can now borrow a new 5th book
        String newBook = book(CirculationPolicy.STANDARD);
        String newCopy = copy(newBook);
        String newReq = submit(studentSession, newBook);
        approve(newReq);
        MvcResult newIssue = issue(newReq, newCopy);
        assertEquals(201, newIssue.getResponse().getStatus());
        assertEquals(5, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE));
    }

    @Test
    void userCanBorrowPreviouslyBorrowedBookAgainAfterReturning() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String bookId = book(CirculationPolicy.STANDARD);
        String copy1 = copy(bookId);
        String copy2 = copy(bookId);

        // First borrowing
        String r1 = submit(studentSession, bookId);
        approve(r1);
        String loan1Id = json(issue(r1, copy1)).get("id").asText();

        // While loan is active, attempting to borrow the same book again is blocked
        MvcResult submitWhileActive = httpPost(studentSession, "/api/v1/borrow-requests", Map.of("bookId", bookId));
        assertEquals(409, submitWhileActive.getResponse().getStatus());
        assertTrue(json(submitWhileActive).get("message").asText().contains("currently have an active loan for this book"));

        // Return the book
        MvcResult returnRes = httpPost(lib, "/api/v1/loans/" + loan1Id + "/return", Map.of("condition", "GOOD"));
        assertEquals(200, returnRes.getResponse().getStatus());

        // Check eligibility endpoint returns eligible = true, hasReturnedHistory = true
        MvcResult eligRes = mvc.perform(get("/api/v1/borrow-requests/eligibility").param("bookId", bookId).session(studentSession)).andReturn();
        assertEquals(200, eligRes.getResponse().getStatus());
        JsonNode eligJson = json(eligRes);
        assertTrue(eligJson.get("eligible").asBoolean());
        assertTrue(eligJson.get("hasReturnedHistory").asBoolean());
        org.junit.jupiter.api.Assertions.assertFalse(eligJson.get("hasActiveLoan").asBoolean());
        org.junit.jupiter.api.Assertions.assertFalse(eligJson.get("hasActiveRequest").asBoolean());

        // Student can now borrow the same book again
        String r2 = submit(studentSession, bookId);
        approve(r2);
        MvcResult issue2 = issue(r2, copy2);
        assertEquals(201, issue2.getResponse().getStatus());
    }

    @Test
    void duplicateBorrowingScenariosCoveredProperly() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String bookId = book(CirculationPolicy.STANDARD);
        String copy1 = copy(bookId);
        String copy2 = copy(bookId);

        // Scenario 1: Never borrowed -> allowed
        MvcResult elig1 = mvc.perform(get("/api/v1/borrow-requests/eligibility").param("bookId", bookId).session(studentSession)).andReturn();
        assertEquals(200, elig1.getResponse().getStatus());
        assertTrue(json(elig1).get("eligible").asBoolean());

        // Scenario 3: Pending request exists -> blocked
        String r1 = submit(studentSession, bookId);
        MvcResult submitPending = httpPost(studentSession, "/api/v1/borrow-requests", Map.of("bookId", bookId));
        assertEquals(409, submitPending.getResponse().getStatus());
        assertTrue(json(submitPending).get("message").asText().contains("pending borrowing request"));

        // Scenario 4: Approved request exists -> blocked
        approve(r1);
        MvcResult submitApproved = httpPost(studentSession, "/api/v1/borrow-requests", Map.of("bookId", bookId));
        assertEquals(409, submitApproved.getResponse().getStatus());
        assertTrue(json(submitApproved).get("message").asText().contains("approved request awaiting book issuance"));

        // Issue book -> loan active. Scenario 2: Active loan exists -> blocked
        String loan1Id = json(issue(r1, copy1)).get("id").asText();
        MvcResult submitActive = httpPost(studentSession, "/api/v1/borrow-requests", Map.of("bookId", bookId));
        assertEquals(409, submitActive.getResponse().getStatus());
        assertTrue(json(submitActive).get("message").asText().contains("currently have an active loan"));

        // Scenario 5: Return loan -> allowed
        httpPost(lib, "/api/v1/loans/" + loan1Id + "/return", Map.of("condition", "GOOD"));
        String r2 = submit(studentSession, bookId);
        approve(r2);
        String loan2Id = json(issue(r2, copy2)).get("id").asText();

        // Scenario 6: Multiple returned loans -> allowed
        httpPost(lib, "/api/v1/loans/" + loan2Id + "/return", Map.of("condition", "GOOD"));
        String r3 = submit(studentSession, bookId);
        org.junit.jupiter.api.Assertions.assertNotNull(r3);

        // Scenario 7: Rejected request -> allowed
        httpPost(lib, "/api/v1/borrow-requests/" + r3 + "/decision", Map.of("decision", "REJECT", "note", "Test rejection"));
        String r4 = submit(studentSession, bookId);
        org.junit.jupiter.api.Assertions.assertNotNull(r4);

        // After rejecting r4 as well -> allowed to request again
        httpPost(lib, "/api/v1/borrow-requests/" + r4 + "/decision", Map.of("decision", "REJECT", "note", "Second rejection"));
        String r5 = submit(studentSession, bookId);
        org.junit.jupiter.api.Assertions.assertNotNull(r5);
    }

    @Test
    void facultyCanBorrowPreviouslyBorrowedBookAgainAfterReturning() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);

        String bookId = book(CirculationPolicy.STANDARD);
        String copy1 = copy(bookId);
        String copy2 = copy(bookId);

        // Faculty first borrowing
        String r1 = submit(facultySession, bookId);
        approve(r1);
        String loanId = json(issue(r1, copy1)).get("id").asText();

        // Return loan
        httpPost(lib, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "GOOD"));

        // Faculty borrowing again after return
        String r2 = submit(facultySession, bookId);
        approve(r2);
        MvcResult issueRes = issue(r2, copy2);
        assertEquals(201, issueRes.getResponse().getStatus());
    }

    @Test
    void libraryPoliciesEndpointReturnsFiveForStudentAndFaculty() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        MvcResult res = mvc.perform(get("/api/v1/policies").session(studentSession)).andReturn();
        assertEquals(200, res.getResponse().getStatus());
        JsonNode policies = json(res);
        JsonNode borrowing = policies.get("borrowing");
        assertEquals(5, borrowing.get("studentMaxBooks").asInt());
        assertEquals(5, borrowing.get("facultyMaxBooks").asInt());
    }

    @Test
    void concurrentRequestsCannotBypassMaximumLimit() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        // Issue 4 books to student
        for (int i = 1; i <= 4; i++) {
            String b = book(CirculationPolicy.STANDARD);
            String c = copy(b);
            String r = submit(studentSession, b);
            approve(r);
            issue(r, c);
        }
        assertEquals(4, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE));

        // Submit 2 requests for different books before issuing either
        String bookA = book(CirculationPolicy.STANDARD);
        String copyA = copy(bookA);
        String reqA = submit(studentSession, bookA);
        approve(reqA);

        String bookB = book(CirculationPolicy.STANDARD);
        String copyB = copy(bookB);
        // Submit reqB while active loans is 4
        String reqB = submit(studentSession, bookB);
        approve(reqB);

        // Concurrently attempt to issue both requests
        MockHttpSession libTwo = login(librarian);
        CountDownLatch latch = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var f1 = CompletableFuture.supplyAsync(() -> issueAfter(latch, lib, reqA, copyA), pool);
            var f2 = CompletableFuture.supplyAsync(() -> issueAfter(latch, libTwo, reqB, copyB), pool);
            latch.countDown();
            int s1 = f1.get(15, TimeUnit.SECONDS);
            int s2 = f2.get(15, TimeUnit.SECONDS);

            // Exactly one should succeed (201) and the other should be rejected (409)
            assertTrue((s1 == 201 && s2 == 409) || (s1 == 409 && s2 == 201),
                    "Expected one 201 and one 409, got: " + s1 + " and " + s2);
            assertEquals(5, loans.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE),
                    "Active loans must not exceed 5");
        } finally {
            pool.shutdownNow();
        }
    }

    private UserAccount member(AccountRole role) {
        String id = UUID.randomUUID().toString();
        return accounts.saveAndFlush(UserAccount.provisionMember(
                role.name().toLowerCase() + "-" + id + "@example.edu",
                encoder.encode(PASSWORD),
                role,
                role.name() + "-" + id,
                librarian.getId(),
                Instant.now()
        ));
    }

    private MockHttpSession login(UserAccount a) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", a.getEmail(), "password", PASSWORD))))
                .andReturn();
        assertEquals(200, r.getResponse().getStatus());
        return (MockHttpSession) r.getRequest().getSession();
    }

    private String book(CirculationPolicy policy) throws Exception {
        String u = UUID.randomUUID().toString();
        return json(httpPost(lib, "/api/v1/books", Map.of(
                "title", "Test book " + u,
                "authors", new String[]{"Author " + u},
                "categories", new String[]{"Category " + u},
                "circulationPolicy", policy.name()
        ))).get("id").asText();
    }

    private String copy(String b) throws Exception {
        return json(httpPost(lib, "/api/v1/books/" + b + "/copies", Map.of(
                "copyIdentifier", "CP-" + UUID.randomUUID()
        ))).get("id").asText();
    }

    private String submit(MockHttpSession s, String b) throws Exception {
        return json(httpPost(s, "/api/v1/borrow-requests", Map.of("bookId", b))).get("id").asText();
    }

    private void approve(String r) throws Exception {
        assertEquals(200, httpPost(lib, "/api/v1/borrow-requests/" + r + "/decision", Map.of("decision", "APPROVE")).getResponse().getStatus());
    }

    private MvcResult issue(String r, String c) throws Exception {
        return httpPost(lib, "/api/v1/borrow-requests/" + r + "/issue", Map.of("copyId", c));
    }

    private int issueAfter(CountDownLatch start, MockHttpSession s, String r, String c) {
        try {
            start.await();
            return issueSession(s, r, c);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private int issueSession(MockHttpSession s, String r, String c) throws Exception {
        return httpPost(s, "/api/v1/borrow-requests/" + r + "/issue", Map.of("copyId", c)).getResponse().getStatus();
    }

    private MvcResult httpPost(MockHttpSession s, String path, Object value) throws Exception {
        return mvc.perform(post(path)
                .session(s)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(value instanceof String x ? x : mapper.writeValueAsString(value)))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }
}
