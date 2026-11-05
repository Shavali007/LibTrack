package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import com.libtrack.settings.SystemSettingRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
class RenewalPolicyAndSemesterAllowanceIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired LoanRepository loans;
    @Autowired BorrowRequestRepository requests;
    @Autowired SystemSettingRepository settings;
    @Autowired AcademicSemesterRepository semesters;
    @Autowired UserSemesterRenewalRepository userSemesterRenewals;
    @Autowired DueDateService dueDates;
    @Autowired Clock clock;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-renew-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);

        // Ensure semesters
        LocalDate today = LocalDate.now(clock);
        if (semesters.findByDate(today).isEmpty()) {
            semesters.saveAndFlush(new AcademicSemester("FALL-2026", "Fall 2026", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 12, 31)));
            semesters.saveAndFlush(new AcademicSemester("SPRING-2027", "Spring 2027", LocalDate.of(2027, 1, 1), LocalDate.of(2027, 6, 30)));
        }
    }

    @Test
    void firstEligibleRenewalSucceedsAndExtendsTwentyOneDays() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b = book(CirculationPolicy.STANDARD);
        String c = copy(b);
        String r = submit(studentSession, b);
        approve(r);
        String loanId = issue(r, c);

        Loan initialLoan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        LocalDate initialDueDate = initialLoan.getDueDate();
        assertEquals(0, initialLoan.getRenewalCount());

        // Renew loan
        MvcResult result = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus());
        JsonNode json = mapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, json.get("renewalCount").asInt());

        LocalDate expectedDueDate = dueDates.calculateDueDate(initialDueDate, 21);
        assertEquals(expectedDueDate.toString(), json.get("dueDate").asText());

        // Verify loan in DB
        Loan updated = loans.findById(UUID.fromString(loanId)).orElseThrow();
        assertEquals(1, updated.getRenewalCount());
        assertEquals(expectedDueDate, updated.getDueDate());

        // Verify UserSemesterRenewal persisted
        assertTrue(userSemesterRenewals.existsByUser_IdAndSemesterCode(student.getId(), "FALL-2026"));
    }

    @Test
    void secondRenewalBySameUserInSameSemesterIsRejectedEvenForAnotherBook() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b1 = book(CirculationPolicy.STANDARD);
        String c1 = copy(b1);
        String r1 = submit(studentSession, b1);
        approve(r1);
        String loan1Id = issue(r1, c1);

        String b2 = book(CirculationPolicy.STANDARD);
        String c2 = copy(b2);
        String r2 = submit(studentSession, b2);
        approve(r2);
        String loan2Id = issue(r2, c2);

        // 1st renewal on Book 1 succeeds
        MvcResult first = mvc.perform(post("/api/v1/loans/" + loan1Id + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(200, first.getResponse().getStatus());

        // 2nd renewal on Book 2 fails with 409 Conflict
        MvcResult second = mvc.perform(post("/api/v1/loans/" + loan2Id + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(409, second.getResponse().getStatus());
        assertTrue(second.getResponse().getContentAsString().contains("renewal allowance of 1 renewal"));

        // Book 2 renewalCount remains 0
        Loan loan2 = loans.findById(UUID.fromString(loan2Id)).orElseThrow();
        assertEquals(0, loan2.getRenewalCount());

        // Querying loans shows loan2 renewalEligible is false
        MvcResult listResult = mvc.perform(get("/api/v1/loans/mine")
                        .session(studentSession))
                .andReturn();
        assertEquals(200, listResult.getResponse().getStatus());
        JsonNode listJson = mapper.readTree(listResult.getResponse().getContentAsString()).get("content");
        for (JsonNode item : listJson) {
            assertFalse(item.get("renewalEligible").asBoolean());
        }
    }

    @Test
    void anotherUserHasIndependentRenewalAllowance() throws Exception {
        UserAccount student1 = member(AccountRole.STUDENT);
        MockHttpSession session1 = login(student1);

        UserAccount student2 = member(AccountRole.STUDENT);
        MockHttpSession session2 = login(student2);

        String b1 = book(CirculationPolicy.STANDARD);
        String c1 = copy(b1);
        String r1 = submit(session1, b1);
        approve(r1);
        String loan1Id = issue(r1, c1);

        String b2 = book(CirculationPolicy.STANDARD);
        String c2 = copy(b2);
        String r2 = submit(session2, b2);
        approve(r2);
        String loan2Id = issue(r2, c2);

        // Student 1 renews
        MvcResult res1 = mvc.perform(post("/api/v1/loans/" + loan1Id + "/renew")
                        .session(session1)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(200, res1.getResponse().getStatus());

        // Student 2 can also renew independently
        MvcResult res2 = mvc.perform(post("/api/v1/loans/" + loan2Id + "/renew")
                        .session(session2)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(200, res2.getResponse().getStatus());
    }

    @Test
    void newSemesterRestoresRenewalAllowance() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        // Pre-consume allowance in FALL-2025
        String bOld = book(CirculationPolicy.STANDARD);
        String cOld = copy(bOld);
        String rOld = submit(studentSession, bOld);
        approve(rOld);
        String oldLoanId = issue(rOld, cOld);
        Loan oldLoan = loans.findById(UUID.fromString(oldLoanId)).orElseThrow();

        userSemesterRenewals.saveAndFlush(new UserSemesterRenewal(student, "FALL-2025", oldLoan, Instant.now()));

        // In current semester (FALL-2026), student still has their allowance!
        String bCur = book(CirculationPolicy.STANDARD);
        String cCur = copy(bCur);
        String rCur = submit(studentSession, bCur);
        approve(rCur);
        String curLoanId = issue(rCur, cCur);

        MvcResult result = mvc.perform(post("/api/v1/loans/" + curLoanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
    }

    @Test
    void backendPersistenceRetainsRenewalAllowance() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b = book(CirculationPolicy.STANDARD);
        String c = copy(b);
        String r = submit(studentSession, b);
        approve(r);
        String loanId = issue(r, c);

        mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());

        // Verify in DB directly
        assertTrue(userSemesterRenewals.existsByUser_IdAndSemesterCode(student.getId(), "FALL-2026"));

        // Second renewal attempt fails
        MvcResult r2 = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(409, r2.getResponse().getStatus());
    }

    @Test
    void concurrentRenewalRequestsCannotBypassLimit() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b1 = book(CirculationPolicy.STANDARD);
        String c1 = copy(b1);
        String r1 = submit(studentSession, b1);
        approve(r1);
        String loan1Id = issue(r1, c1);

        String b2 = book(CirculationPolicy.STANDARD);
        String c2 = copy(b2);
        String r2 = submit(studentSession, b2);
        approve(r2);
        String loan2Id = issue(r2, c2);

        int concurrency = 2;
        var executor = Executors.newFixedThreadPool(concurrency);
        var startLatch = new CountDownLatch(1);
        List<CompletableFuture<Integer>> futures = new ArrayList<>();

        futures.add(CompletableFuture.supplyAsync(() -> {
            try {
                startLatch.await();
                return mvc.perform(post("/api/v1/loans/" + loan1Id + "/renew")
                                .session(studentSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON))
                        .andReturn().getResponse().getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, executor));

        futures.add(CompletableFuture.supplyAsync(() -> {
            try {
                startLatch.await();
                return mvc.perform(post("/api/v1/loans/" + loan2Id + "/renew")
                                .session(studentSession)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON))
                        .andReturn().getResponse().getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, executor));

        startLatch.countDown();
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(10, TimeUnit.SECONDS);

        int okCount = 0;
        int conflictCount = 0;
        for (var f : futures) {
            int status = f.get();
            if (status == 200) okCount++;
            else if (status == 409) conflictCount++;
        }

        executor.shutdown();
        assertEquals(1, okCount, "Exactly 1 renewal must succeed");
        assertEquals(1, conflictCount, "Second concurrent renewal must be rejected with 409 Conflict");
    }

    @Test
    void libraryPoliciesEndpointReturnsTwentyOneDaysAndOnePerSemester() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        MvcResult result = mvc.perform(get("/api/v1/policies").session(studentSession))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
        JsonNode json = mapper.readTree(result.getResponse().getContentAsString());

        JsonNode renewal = json.get("renewal");
        assertEquals("1 per semester", renewal.get("maxRenewals").asText());
        assertEquals("21 days", renewal.get("extensionPeriod").asText());
    }

    @Test
    void overdueLoanRenewalIsRejectedWith409AndClearMessage() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b = book(CirculationPolicy.STANDARD);
        String c = copy(b);
        String r = submit(studentSession, b);
        approve(r);
        String loanId = issue(r, c);

        // Advance past due date
        LocalDate today = LocalDate.now(clock);
        Loan loan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        // Set due date to 2 days ago
        org.springframework.test.util.ReflectionTestUtils.setField(loan, "dueDate", today.minusDays(2));
        loans.saveAndFlush(loan);

        // Verify /api/v1/loans/mine reports renewalEligible as false and overdue as true
        MvcResult listRes = mvc.perform(get("/api/v1/loans/mine").session(studentSession)).andReturn();
        assertEquals(200, listRes.getResponse().getStatus());
        JsonNode listJson = mapper.readTree(listRes.getResponse().getContentAsString()).get("content");
        JsonNode myLoan = listJson.get(0);
        assertTrue(myLoan.get("overdue").asBoolean());
        assertFalse(myLoan.get("renewalEligible").asBoolean());

        // Attempt renewal -> must fail with 409 Conflict and clear message
        MvcResult renewRes = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        assertEquals(409, renewRes.getResponse().getStatus());
        String content = renewRes.getResponse().getContentAsString();
        assertTrue(content.contains("Renewal is unavailable because this loan has passed its due date. Please return the book to the circulation desk."));
    }

    @Test
    void renewalOnExactDueDateSucceeds() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String b = book(CirculationPolicy.STANDARD);
        String c = copy(b);
        String r = submit(studentSession, b);
        approve(r);
        String loanId = issue(r, c);

        // Set due date to today
        LocalDate today = LocalDate.now(clock);
        Loan loan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        org.springframework.test.util.ReflectionTestUtils.setField(loan, "dueDate", today);
        loans.saveAndFlush(loan);

        // Verify /api/v1/loans/mine reports renewalEligible as true and overdue as false
        MvcResult listRes = mvc.perform(get("/api/v1/loans/mine").session(studentSession)).andReturn();
        assertEquals(200, listRes.getResponse().getStatus());
        JsonNode listJson = mapper.readTree(listRes.getResponse().getContentAsString()).get("content");
        JsonNode myLoan = listJson.get(0);
        assertFalse(myLoan.get("overdue").asBoolean());
        assertTrue(myLoan.get("renewalEligible").asBoolean());

        // Renew on due date itself succeeds
        MvcResult renewRes = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        assertEquals(200, renewRes.getResponse().getStatus());
        JsonNode json = mapper.readTree(renewRes.getResponse().getContentAsString());
        assertEquals(1, json.get("renewalCount").asInt());
    }

    @Test
    void facultyFollowsIdenticalRenewalAndOverdueRestrictions() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);

        String b = book(CirculationPolicy.STANDARD);
        String c = copy(b);
        String r = submit(facultySession, b);
        approve(r);
        String loanId = issue(r, c);

        LocalDate today = LocalDate.now(clock);
        Loan loan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        org.springframework.test.util.ReflectionTestUtils.setField(loan, "dueDate", today.minusDays(1));
        loans.saveAndFlush(loan);

        // Faculty renewal on overdue loan rejected with 409
        MvcResult renewRes = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(facultySession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        assertEquals(409, renewRes.getResponse().getStatus());
        assertTrue(renewRes.getResponse().getContentAsString().contains("Renewal is unavailable because this loan has passed its due date."));
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

    private String book(CirculationPolicy policy) throws Exception {
        String u = UUID.randomUUID().toString();
        return json(httpPost(libSession, "/api/v1/books", Map.of(
                "title", "Test book " + u,
                "authors", new String[]{"Author " + u},
                "categories", new String[]{"Category " + u},
                "circulationPolicy", policy.name()
        ))).get("id").asText();
    }

    private String copy(String b) throws Exception {
        return json(httpPost(libSession, "/api/v1/books/" + b + "/copies", Map.of(
                "copyIdentifier", "CP-" + UUID.randomUUID()
        ))).get("id").asText();
    }

    private String submit(MockHttpSession s, String b) throws Exception {
        return json(httpPost(s, "/api/v1/borrow-requests", Map.of("bookId", b))).get("id").asText();
    }

    private void approve(String r) throws Exception {
        assertEquals(200, httpPost(libSession, "/api/v1/borrow-requests/" + r + "/decision", Map.of("decision", "APPROVE")).getResponse().getStatus());
    }

    private String issue(String r, String c) throws Exception {
        MvcResult res = httpPost(libSession, "/api/v1/borrow-requests/" + r + "/issue", Map.of("copyId", c));
        assertEquals(201, res.getResponse().getStatus());
        return json(res).get("id").asText();
    }

    private MvcResult httpPost(MockHttpSession s, String path, Object val) throws Exception {
        return mvc.perform(post(path)
                .session(s)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(val)))
                .andReturn();
    }

    private JsonNode json(MvcResult r) throws Exception {
        return mapper.readTree(r.getResponse().getContentAsString());
    }
}
