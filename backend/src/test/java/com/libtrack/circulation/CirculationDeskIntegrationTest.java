package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@LibTrackIntegrationTest
class CirculationDeskIntegrationTest {

    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired private MockMvc mvc;
    @Autowired private UserAccountRepository accounts;
    @Autowired private PasswordEncoder encoder;
    @Autowired private BookRepository books;
    @Autowired private BookCopyRepository copies;
    @Autowired private BorrowRequestRepository requests;
    @Autowired private LoanRepository loans;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-desk-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
    }

    @Test
    void activeLoansTabReturnsOnlyActiveLoansWithRoleAndDaysLeft() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        MockHttpSession facultySession = login(member(AccountRole.FACULTY));

        String bookA = createBook("Algorithm Design");
        String copyA = createCopy(bookA);
        String reqA = submitRequest(studentSession, bookA);
        approveRequest(reqA);
        issueCopy(reqA, copyA);

        String bookB = createBook("Quantum Physics");
        String copyB = createCopy(bookB);
        String reqB = submitRequest(facultySession, bookB);
        approveRequest(reqB);
        issueCopy(reqB, copyB);

        // Fetch active loans as Librarian
        MvcResult res = mvc.perform(get("/api/v1/loans").session(libSession)).andReturn();
        assertEquals(200, res.getResponse().getStatus());
        JsonNode data = json(res);
        assertTrue(data.get("totalElements").asInt() >= 2);

        JsonNode firstItem = data.get("content").get(0);
        assertTrue(firstItem.has("borrowerRole"));
        assertTrue(firstItem.has("daysLeft"));
        assertEquals("ACTIVE", firstItem.get("status").asText());

        // Filter by role STUDENT
        MvcResult studentFiltered = mvc.perform(get("/api/v1/loans?role=STUDENT").session(libSession)).andReturn();
        JsonNode sData = json(studentFiltered);
        for (JsonNode item : sData.get("content")) {
            assertEquals("STUDENT", item.get("borrowerRole").asText());
        }

        // Search by book title
        MvcResult searchResult = mvc.perform(get("/api/v1/loans?search=Algorithm").session(libSession)).andReturn();
        JsonNode searchData = json(searchResult);
        assertTrue(searchData.get("totalElements").asInt() >= 1);
        assertEquals("Algorithm Design", searchData.get("content").get(0).get("bookTitle").asText());
    }

    @Test
    void circulationSummaryReturnsAccurateDatabaseCounts() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Database Systems");
        String copy1 = createCopy(book);
        String copy2 = createCopy(book);

        String req1 = submitRequest(studentSession, book);
        approveRequest(req1);
        MvcResult issued1 = issueCopy(req1, copy1);
        String loanId1 = json(issued1).get("id").asText();

        MvcResult sumResBefore = mvc.perform(get("/api/v1/circulation/summary").session(libSession)).andReturn();
        assertEquals(200, sumResBefore.getResponse().getStatus());
        JsonNode summaryBefore = json(sumResBefore);
        long activeBefore = summaryBefore.get("activeLoans").asLong();
        long returnsBefore = summaryBefore.get("totalReturnsThisMonth").asLong();

        // Perform good return
        MvcResult retRes = postJson(libSession, "/api/v1/loans/" + loanId1 + "/return", Map.of("condition", "GOOD"));
        assertEquals(200, retRes.getResponse().getStatus());

        MvcResult sumResAfter = mvc.perform(get("/api/v1/circulation/summary").session(libSession)).andReturn();
        JsonNode summaryAfter = json(sumResAfter);
        assertEquals(activeBefore - 1, summaryAfter.get("activeLoans").asLong());
        assertEquals(returnsBefore + 1, summaryAfter.get("totalReturnsThisMonth").asLong());
    }

    @Test
    void returnDamagedQuarantinesCopyAndAppearsInLostDamagedTab() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Compilers Principles");
        String copyId = createCopy(book);
        String reqId = submitRequest(studentSession, book);
        approveRequest(reqId);
        String loanId = json(issueCopy(reqId, copyId)).get("id").asText();

        // Return with condition DAMAGED without note should fail (409)
        MvcResult failNoNote = postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "DAMAGED"));
        assertEquals(409, failNoNote.getResponse().getStatus());

        // Return with condition DAMAGED and note
        MvcResult retRes = postJson(libSession, "/api/v1/loans/" + loanId + "/return",
                Map.of("condition", "DAMAGED", "note", "Cover torn and water damage observed."));
        assertEquals(200, retRes.getResponse().getStatus());
        assertEquals("DAMAGED", copies.findById(UUID.fromString(copyId)).orElseThrow().getStatus().name());

        // Verify Lost & Damaged Tab query
        MvcResult ldRes = mvc.perform(get("/api/v1/circulation/lost-damaged?condition=DAMAGED").session(libSession)).andReturn();
        assertEquals(200, ldRes.getResponse().getStatus());
        JsonNode ldData = json(ldRes);
        assertTrue(ldData.get("totalElements").asInt() >= 1);
        JsonNode damagedItem = ldData.get("content").get(0);
        assertEquals("DAMAGED", damagedItem.get("condition").asText());
        assertEquals("Cover torn and water damage observed.", damagedItem.get("caseNote").asText());
    }

    @Test
    void returnLostKeepsUnavailableAndAppearsInLostDamagedTab() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Networks & Security");
        String copyId = createCopy(book);
        String reqId = submitRequest(studentSession, book);
        approveRequest(reqId);
        String loanId = json(issueCopy(reqId, copyId)).get("id").asText();

        // Return with condition LOST and note
        MvcResult retRes = postJson(libSession, "/api/v1/loans/" + loanId + "/return",
                Map.of("condition", "LOST", "note", "Borrower reported material misplaced."));
        assertEquals(200, retRes.getResponse().getStatus());
        assertEquals("LOST", copies.findById(UUID.fromString(copyId)).orElseThrow().getStatus().name());

        // Verify Lost & Damaged Tab query with filter LOST
        MvcResult ldRes = mvc.perform(get("/api/v1/circulation/lost-damaged?condition=LOST").session(libSession)).andReturn();
        assertEquals(200, ldRes.getResponse().getStatus());
        JsonNode ldData = json(ldRes);
        assertTrue(ldData.get("totalElements").asInt() >= 1);
        JsonNode lostItem = ldData.get("content").get(0);
        assertEquals("LOST", lostItem.get("condition").asText());
        assertEquals("Borrower reported material misplaced.", lostItem.get("caseNote").asText());
    }

    @Test
    void duplicateReturnAttemptIsSafelyRejected() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Computer Organization");
        String copyId = createCopy(book);
        String reqId = submitRequest(studentSession, book);
        approveRequest(reqId);
        String loanId = json(issueCopy(reqId, copyId)).get("id").asText();

        // First return succeeds
        assertEquals(200, postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "GOOD")).getResponse().getStatus());

        // Second return attempt should be rejected with 409
        MvcResult dupRes = postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "GOOD"));
        assertEquals(409, dupRes.getResponse().getStatus());
    }

    @Test
    void circulationHistoryTabReturnsCompletedTransactionsWithFilters() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Distributed Systems");
        String copyId = createCopy(book);
        String reqId = submitRequest(studentSession, book);
        approveRequest(reqId);
        String loanId = json(issueCopy(reqId, copyId)).get("id").asText();

        postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "GOOD", "note", "Returned in fine condition."));

        // Query history
        MvcResult histRes = mvc.perform(get("/api/v1/loans?historyOnly=true").session(libSession)).andReturn();
        assertEquals(200, histRes.getResponse().getStatus());
        JsonNode histData = json(histRes);
        assertTrue(histData.get("totalElements").asInt() >= 1);
        JsonNode returnedLoan = histData.get("content").get(0);
        assertEquals("RETURNED", returnedLoan.get("status").asText());
        assertEquals("GOOD", returnedLoan.get("returnCondition").asText());
        assertEquals(librarian.getEmail(), returnedLoan.get("processedByEmail").asText());

        // History condition filter
        MvcResult goodFilter = mvc.perform(get("/api/v1/loans?historyOnly=true&condition=GOOD").session(libSession)).andReturn();
        assertEquals(200, goodFilter.getResponse().getStatus());
        assertTrue(json(goodFilter).get("totalElements").asInt() >= 1);

        MvcResult damagedFilter = mvc.perform(get("/api/v1/loans?historyOnly=true&condition=DAMAGED").session(libSession)).andReturn();
        assertEquals(200, damagedFilter.getResponse().getStatus());
    }

    @Test
    void circulationStatsReturnsComprehensiveAggregations() throws Exception {
        MvcResult res = mvc.perform(get("/api/v1/circulation/stats").session(libSession)).andReturn();
        assertEquals(200, res.getResponse().getStatus());
        JsonNode stats = json(res);

        assertTrue(stats.has("activeLoans"));
        assertTrue(stats.has("totalReturnsThisMonth"));
        assertTrue(stats.has("totalGoodReturns"));
        assertTrue(stats.has("totalDamagedCopies"));
        assertTrue(stats.has("totalLostCopies"));
        assertTrue(stats.has("overdueLoans"));
        assertTrue(stats.has("activityOverTime"));
        assertTrue(stats.has("returnConditions"));
        assertTrue(stats.has("memberBreakdown"));
        assertTrue(stats.get("activityOverTime").isArray());
    }

    @Test
    void roleAuthorizationEnforcesLibrarianAccess() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        MockHttpSession facultySession = login(member(AccountRole.FACULTY));

        assertEquals(403, mvc.perform(get("/api/v1/circulation/summary").session(studentSession)).andReturn().getResponse().getStatus());
        assertEquals(403, mvc.perform(get("/api/v1/circulation/summary").session(facultySession)).andReturn().getResponse().getStatus());
        assertEquals(401, mvc.perform(get("/api/v1/circulation/summary")).andReturn().getResponse().getStatus());

        assertEquals(403, mvc.perform(get("/api/v1/circulation/lost-damaged").session(studentSession)).andReturn().getResponse().getStatus());
        assertEquals(403, mvc.perform(get("/api/v1/circulation/stats").session(studentSession)).andReturn().getResponse().getStatus());
    }

    @Test
    void librarianCanEditDamagedBookToGoodAndInventoryBecomesAvailable() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Operating System Concepts");
        String copy = createCopy(book);
        String req = submitRequest(studentSession, book);
        approveRequest(req);
        MvcResult issue = issueCopy(req, copy);
        String loanId = json(issue).get("id").asText();

        // Return as DAMAGED
        MvcResult retRes = postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of(
                "condition", "DAMAGED",
                "note", "Cover torn"
        ));
        assertEquals(200, retRes.getResponse().getStatus());
        assertEquals("DAMAGED", copies.findById(UUID.fromString(copy)).orElseThrow().getStatus().name());

        // Librarian edits condition to GOOD
        MvcResult editRes = putJson(libSession, "/api/v1/circulation/loans/" + loanId + "/condition", Map.of(
                "condition", "GOOD",
                "reason", "Spine repaired and inspected by senior librarian."
        ));
        assertEquals(200, editRes.getResponse().getStatus());
        JsonNode edited = json(editRes);
        assertEquals("GOOD", edited.get("returnCondition").asText());
        assertEquals("RETURNED", edited.get("status").asText());
        assertEquals("AVAILABLE", edited.get("inventoryStatus").asText());

        // Verify copy in database is now AVAILABLE
        assertEquals(CopyStatus.AVAILABLE, copies.findById(UUID.fromString(copy)).orElseThrow().getStatus());
    }

    @Test
    void librarianCanEditLostBookToGoodAndInventoryBecomesAvailable() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Computer Networks");
        String copy = createCopy(book);
        String req = submitRequest(studentSession, book);
        approveRequest(req);
        MvcResult issue = issueCopy(req, copy);
        String loanId = json(issue).get("id").asText();

        // Return as LOST
        MvcResult retRes = postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of(
                "condition", "LOST",
                "note", "Missing after lab session"
        ));
        assertEquals(200, retRes.getResponse().getStatus());
        assertEquals(CopyStatus.LOST, copies.findById(UUID.fromString(copy)).orElseThrow().getStatus());

        // Recover and change condition to GOOD
        MvcResult editRes = putJson(libSession, "/api/v1/circulation/loans/" + loanId + "/condition", Map.of(
                "condition", "GOOD",
                "reason", "Book recovered from student locker in pristine state."
        ));
        assertEquals(200, editRes.getResponse().getStatus());
        JsonNode edited = json(editRes);
        assertEquals("GOOD", edited.get("returnCondition").asText());
        assertEquals("RETURNED", edited.get("status").asText());
        assertNotNull(edited.get("actualReturnDate").asText());

        // Copy is now AVAILABLE
        assertEquals(CopyStatus.AVAILABLE, copies.findById(UUID.fromString(copy)).orElseThrow().getStatus());
    }

    @Test
    void conditionChangeRequiresReasonAndRejectsActiveLoansAndUnauthorizedRoles() throws Exception {
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String book = createBook("Discrete Mathematics");
        String copy = createCopy(book);
        String req = submitRequest(studentSession, book);
        approveRequest(req);
        MvcResult issue = issueCopy(req, copy);
        String loanId = json(issue).get("id").asText();

        // 1. Cannot update condition of ACTIVE loan
        MvcResult activeFail = putJson(libSession, "/api/v1/circulation/loans/" + loanId + "/condition", Map.of(
                "condition", "GOOD",
                "reason", "Cannot change active loan"
        ));
        assertEquals(409, activeFail.getResponse().getStatus());

        // Complete the loan
        postJson(libSession, "/api/v1/loans/" + loanId + "/return", Map.of(
                "condition", "GOOD"
        ));

        // 2. Reject blank reason
        MvcResult blankReason = putJson(libSession, "/api/v1/circulation/loans/" + loanId + "/condition", Map.of(
                "condition", "DAMAGED",
                "reason", "   "
        ));
        assertTrue(blankReason.getResponse().getStatus() == 400 || blankReason.getResponse().getStatus() == 409);

        // 3. Student is forbidden
        MvcResult studentDenied = putJson(studentSession, "/api/v1/circulation/loans/" + loanId + "/condition", Map.of(
                "condition", "GOOD",
                "reason", "Student trying to edit"
        ));
        assertEquals(403, studentDenied.getResponse().getStatus());
    }

    // --- Helpers ---

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

    private String createBook(String title) throws Exception {
        String u = UUID.randomUUID().toString();
        return json(postJson(libSession, "/api/v1/books", Map.of(
                "title", title,
                "authors", new String[]{"Author " + u},
                "categories", new String[]{"Computer Science"},
                "circulationPolicy", CirculationPolicy.STANDARD.name()
        ))).get("id").asText();
    }

    private String createCopy(String bookId) throws Exception {
        return json(postJson(libSession, "/api/v1/books/" + bookId + "/copies",
                Map.of("copyIdentifier", "CP-" + UUID.randomUUID().toString().substring(0, 8))))
                .get("id").asText();
    }

    private String submitRequest(MockHttpSession memberSession, String bookId) throws Exception {
        return json(postJson(memberSession, "/api/v1/borrow-requests", Map.of("bookId", bookId))).get("id").asText();
    }

    private void approveRequest(String requestId) throws Exception {
        MvcResult res = postJson(libSession, "/api/v1/borrow-requests/" + requestId + "/decision", Map.of("decision", "APPROVE"));
        assertEquals(200, res.getResponse().getStatus());
    }

    private MvcResult issueCopy(String requestId, String copyId) throws Exception {
        MvcResult res = postJson(libSession, "/api/v1/borrow-requests/" + requestId + "/issue", Map.of("copyId", copyId));
        assertEquals(201, res.getResponse().getStatus());
        return res;
    }

    private MvcResult postJson(MockHttpSession session, String path, Object payload) throws Exception {
        return mvc.perform(post(path)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andReturn();
    }

    private MvcResult putJson(MockHttpSession session, String path, Object payload) throws Exception {
        return mvc.perform(put(path)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }
}
