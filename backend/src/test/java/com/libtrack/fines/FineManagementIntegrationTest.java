package com.libtrack.fines;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.RequestDecision;
import com.libtrack.notifications.DueDateReminderScheduler;
import com.libtrack.notifications.NotificationService;
import com.libtrack.settings.SystemSetting;
import com.libtrack.settings.SystemSettingRepository;

@LibTrackIntegrationTest
class FineManagementIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired private MockMvc mvc;
    @Autowired private UserAccountRepository accounts;
    @Autowired private PasswordEncoder encoder;
    @Autowired private BookRepository books;
    @Autowired private BookCopyRepository copies;
    @Autowired private BorrowRequestRepository requests;
    @Autowired private LoanRepository loans;
    @Autowired private FineRepository fines;
    @Autowired private FinePaymentRepository payments;
    @Autowired private SystemSettingRepository settingRepository;
    @Autowired private FineService fineService;
    @Autowired private DueDateReminderScheduler reminderScheduler;
    @Autowired private NotificationService notificationService;
    @Autowired private Clock clock;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;
    private final Map<String, String> originalFineSettings = new HashMap<>();

    @BeforeEach
    void setup() throws Exception {
        originalFineSettings.clear();
        for (String key : List.of("fine.daily.rate", "fine.max.limit", "fine.grace.period.days", "loan.period.days")) {
            originalFineSettings.put(key, settingRepository.findById(key).map(SystemSetting::getSettingValue).orElse(null));
        }
        String uid = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-fine-" + uid + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
        setDefaultSetting("fine.daily.rate", "10");
        setDefaultSetting("fine.max.limit", "500");
        setDefaultSetting("fine.grace.period.days", "0");
        setDefaultSetting("loan.period.days", "21");
    }

    @AfterEach
    void restoreFineSettings() {
        originalFineSettings.forEach((key, value) -> {
            if (value == null) {
                settingRepository.deleteById(key);
            } else {
                SystemSetting setting = settingRepository.findById(key)
                        .orElseGet(() -> new SystemSetting(key, value, clock.instant(), librarian));
                setting.update(value, clock.instant(), librarian);
                settingRepository.save(setting);
            }
        });
    }

    private void setDefaultSetting(String key, String value) {
        SystemSetting setting = settingRepository.findById(key)
                .orElseGet(() -> new SystemSetting(key, value, clock.instant(), librarian));
        setting.update(value, clock.instant(), librarian);
        settingRepository.saveAndFlush(setting);
    }

    @Test
    void overdueLoanAssessesFineAtDailyRateAndAllowsOnlyFullPayment() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String bookId = createBook();
        String copyId = createCopy(bookId);

        Book book = books.findById(UUID.fromString(bookId)).orElseThrow();
        BookCopy copy = copies.findById(UUID.fromString(copyId)).orElseThrow();
        copy.update(copy.getCopyIdentifier(), copy.getLocation(), CopyStatus.ON_LOAN);
        copies.saveAndFlush(copy);

        BorrowRequest req = requests.saveAndFlush(new BorrowRequest(student, book, Instant.now()));
        req.decide(RequestDecision.APPROVE, librarian, null, Instant.now());
        req.markIssued();
        requests.saveAndFlush(req);

        // Due 5 days ago -> 5 days overdue -> 5 * 10 = ₹50
        LocalDate today = LocalDate.now(clock);
        LocalDate issueDate = today.minusDays(26);
        LocalDate dueDate = today.minusDays(5);
        Loan loan = new Loan(req, copy, librarian, issueDate, dueDate, BigDecimal.valueOf(10.00), BigDecimal.valueOf(500.00), 0);
        loan = loans.saveAndFlush(loan);

        // Trigger fine calculation
        fineService.recalculateOverdueFines();

        List<Fine> studentFines = fines.findAll();
        assertFalse(studentFines.isEmpty());
        final UUID finalLoanId = loan.getId();
        Fine assessed = studentFines.stream().filter(f -> f.getLoan().getId().equals(finalLoanId)).findFirst().orElseThrow();
        assertEquals(5, assessed.getOverdueDays());
        assertEquals(new BigDecimal("50.00"), assessed.getFineAmount());
        assertEquals(FineStatus.UNPAID, assessed.getStatus());

        // Librarian views summary
        MvcResult summaryResult = mvc.perform(get("/api/v1/librarian/fines/summary").session(libSession)).andReturn();
        assertEquals(200, summaryResult.getResponse().getStatus());
        JsonNode summary = mapper.readTree(summaryResult.getResponse().getContentAsString());
        assertTrue(summary.get("totalFines").asLong() >= 1);
        assertTrue(summary.get("unpaidFines").asLong() >= 1);
        assertTrue(summary.get("totalOutstanding").asDouble() >= 50.0);

        // Student views their own fines
        MvcResult myFinesResult = mvc.perform(get("/api/v1/fines/mine").session(studentSession)).andReturn();
        assertEquals(200, myFinesResult.getResponse().getStatus());
        JsonNode myFines = mapper.readTree(myFinesResult.getResponse().getContentAsString());
        assertEquals(1, myFines.size());
        assertEquals(50.0, myFines.get(0).get("fineAmount").asDouble());
        assertEquals(10.0, myFines.get(0).get("dailyRate").asDouble());
        assertEquals(500.0, myFines.get(0).get("maxFine").asDouble());
        assertEquals(0, myFines.get(0).get("gracePeriodDays").asInt());

        // Attempt partial payment (₹25 instead of ₹50) -> Must fail with 409 Conflict
        MvcResult partialPay = mvc.perform(post("/api/v1/librarian/fines/" + assessed.getId() + "/payments")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("amount", 25.00, "receiptNumber", "REC-PARTIAL"))))
                .andReturn();
        assertEquals(409, partialPay.getResponse().getStatus());

        // Full payment (₹50) -> Succeeds
        MvcResult fullPay = mvc.perform(post("/api/v1/librarian/fines/" + assessed.getId() + "/payments")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("amount", 50.00, "receiptNumber", "REC-2026-001"))))
                .andReturn();
        assertEquals(200, fullPay.getResponse().getStatus());
        JsonNode paidFine = mapper.readTree(fullPay.getResponse().getContentAsString());
        assertEquals("PAID", paidFine.get("status").asText());
        assertEquals(1, paidFine.get("payments").size());
        assertEquals("REC-2026-001", paidFine.get("payments").get(0).get("receiptNumber").asText());

        // Repeating payment conflicts
        MvcResult repeatPay = mvc.perform(post("/api/v1/librarian/fines/" + assessed.getId() + "/payments")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("amount", 50.00, "receiptNumber", "REC-REPEAT"))))
                .andReturn();
        assertEquals(409, repeatPay.getResponse().getStatus());
    }

    @Test
    void policyApisReturnTheSameConfiguredValuesAndDescribeManualPayment() throws Exception {
        setSetting("fine.daily.rate", "10");
        setSetting("fine.max.limit", "500");
        setSetting("fine.grace.period.days", "0");
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));

        JsonNode librarianPolicy = mapper.readTree(mvc.perform(get("/api/v1/librarian/fines/policy").session(libSession))
                .andReturn().getResponse().getContentAsString());
        JsonNode memberPolicy = mapper.readTree(mvc.perform(get("/api/v1/policies").session(studentSession))
                .andReturn().getResponse().getContentAsString()).get("fines");

        assertEquals("ACTIVE", librarianPolicy.get("status").asText());
        assertTrue(librarianPolicy.get("monetaryFinesEnabled").asBoolean());
        assertEquals(10.0, librarianPolicy.get("dailyFineRate").asDouble());
        assertEquals(500.0, librarianPolicy.get("maximumFinePerBook").asDouble());
        assertEquals(0, librarianPolicy.get("gracePeriodDays").asInt());
        assertEquals(21, librarianPolicy.get("loanPeriodDays").asInt());
        assertTrue(librarianPolicy.get("configured").asBoolean());
        assertEquals("₹10", memberPolicy.get("overdueFinePerDay").asText());
        assertEquals("₹500", memberPolicy.get("maxFinePerBook").asText());
        assertEquals("0 days", memberPolicy.get("gracePeriod").asText());
        assertEquals(librarianPolicy.get("status").asText(), memberPolicy.get("status").asText());
        assertTrue(librarianPolicy.get("policyDescription").asText().contains("manually"));
        assertFalse(librarianPolicy.get("policyDescription").asText().contains("UNCONFIGURED"));
    }

    @Test
    void finePolicyCanBeUpdatedAtomicallyAndMemberPolicyShowsOneSharedLoanTerm() throws Exception {
        MvcResult update = mvc.perform(put("/api/v1/librarian/settings/fine-policy")
                .session(libSession).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "dailyFineRate", 5.00,
                        "maximumFinePerBook", 200.00,
                        "gracePeriodDays", 2,
                        "loanPeriodDays", 30))))
                .andReturn();
        assertEquals(204, update.getResponse().getStatus());
        assertEquals("5.00", settingRepository.findById("fine.daily.rate").orElseThrow().getSettingValue());
        assertEquals("200.00", settingRepository.findById("fine.max.limit").orElseThrow().getSettingValue());
        assertEquals("2", settingRepository.findById("fine.grace.period.days").orElseThrow().getSettingValue());
        assertEquals("30", settingRepository.findById("loan.period.days").orElseThrow().getSettingValue());

        UserAccount student = member(AccountRole.STUDENT);
        JsonNode policy = mapper.readTree(mvc.perform(get("/api/v1/policies").session(login(student)))
                .andReturn().getResponse().getContentAsString()).get("borrowing");
        assertEquals(policy.get("studentLoanDays").asInt(), policy.get("facultyLoanDays").asInt());
        assertEquals(30, policy.get("studentLoanDays").asInt());
    }

    @Test
    void policyUpdateRejectsInvalidValuesAndNonLibrarians() throws Exception {
        String invalid = mapper.writeValueAsString(Map.of(
                "dailyFineRate", 5.00,
                "maximumFinePerBook", 200.00,
                "gracePeriodDays", 2,
                "loanPeriodDays", 0));
        assertEquals(400, mvc.perform(put("/api/v1/librarian/settings/fine-policy")
                .session(libSession).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andReturn().getResponse().getStatus());

        MockHttpSession studentSession = login(member(AccountRole.STUDENT));
        String valid = mapper.writeValueAsString(Map.of(
                "dailyFineRate", 5.00,
                "maximumFinePerBook", 200.00,
                "gracePeriodDays", 2,
                "loanPeriodDays", 30));
        assertEquals(403, mvc.perform(put("/api/v1/librarian/settings/fine-policy")
                .session(studentSession).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(valid))
                .andReturn().getResponse().getStatus());
    }

    @Test
    void zeroRateDisablesMonetaryFineAssessmentInBothPolicyApis() throws Exception {
        setSetting("fine.daily.rate", "0");
        MockHttpSession studentSession = login(member(AccountRole.STUDENT));

        JsonNode librarianPolicy = mapper.readTree(mvc.perform(get("/api/v1/librarian/fines/policy").session(libSession))
                .andReturn().getResponse().getContentAsString());
        JsonNode memberPolicy = mapper.readTree(mvc.perform(get("/api/v1/policies").session(studentSession))
                .andReturn().getResponse().getContentAsString()).get("fines");

        assertEquals("DISABLED", librarianPolicy.get("status").asText());
        assertFalse(librarianPolicy.get("monetaryFinesEnabled").asBoolean());
        assertEquals("DISABLED", memberPolicy.get("status").asText());
        assertFalse(memberPolicy.get("monetaryFinesEnabled").asBoolean());
    }

    @Test
    void finePolicyUpdatesRejectNegativeMalformedAndOutOfRangeValues() throws Exception {
        for (Map.Entry<String, String> invalid : List.of(
                Map.entry("fine.daily.rate", "-0.01"),
                Map.entry("fine.max.limit", "100000000"),
                Map.entry("fine.daily.rate", "1.234"),
                Map.entry("fine.grace.period.days", "-1")
        )) {
            MvcResult result = setSettingResult(invalid.getKey(), invalid.getValue());
            assertEquals(400, result.getResponse().getStatus(), invalid.toString());
            assertEquals("INVALID_SETTING", mapper.readTree(result.getResponse().getContentAsString()).get("error").asText());
        }
        MvcResult fractionalGrace = setSettingResult("fine.grace.period.days", "1.5");
        assertEquals(400, fractionalGrace.getResponse().getStatus());
    }

    @Test
    void loansSnapshotPolicyAtIssueAndLaterChangesOnlyAffectNewLoans() throws Exception {
        setSetting("fine.daily.rate", "10");
        setSetting("fine.max.limit", "500");
        setSetting("fine.grace.period.days", "0");
        Loan first = issueLoan(member(AccountRole.STUDENT));

        setSetting("fine.daily.rate", "15");
        setSetting("fine.max.limit", "600");
        setSetting("fine.grace.period.days", "2");
        Loan second = issueLoan(member(AccountRole.STUDENT));

        assertEquals(new BigDecimal("10.00"), first.getDailyFineRate());
        assertEquals(new BigDecimal("500.00"), first.getMaxFineAmount());
        assertEquals(0, first.getGracePeriodDays());
        assertEquals(new BigDecimal("15.00"), second.getDailyFineRate());
        assertEquals(new BigDecimal("600.00"), second.getMaxFineAmount());
        assertEquals(2, second.getGracePeriodDays());
    }

    @Test
    void gracePeriodRateAndMaximumCapAreAppliedToLoanSnapshots() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        Loan atGraceBoundary = createOverdueLoan(student, 2, new BigDecimal("15.00"), new BigDecimal("40.00"), 2);
        Loan afterGrace = createOverdueLoan(member(AccountRole.FACULTY), 3, new BigDecimal("15.00"), new BigDecimal("40.00"), 2);
        Loan aboveCap = createOverdueLoan(member(AccountRole.STUDENT), 6, new BigDecimal("15.00"), new BigDecimal("40.00"), 2);

        fineService.recalculateOverdueFines();

        assertTrue(fines.findByLoan_Id(atGraceBoundary.getId()).isEmpty());
        assertEquals(new BigDecimal("15.00"), fines.findByLoan_Id(afterGrace.getId()).orElseThrow().getFineAmount());
        assertEquals(new BigDecimal("40.00"), fines.findByLoan_Id(aboveCap.getId()).orElseThrow().getFineAmount());
    }

    @Test
    void returningAnOverdueLoanFinalizesItsSnapshotFine() throws Exception {
        Loan overdueLoan = createOverdueLoan(member(AccountRole.STUDENT), 5,
                new BigDecimal("10.00"), new BigDecimal("500.00"), 0);
        overdueLoan.returnCopy(com.libtrack.circulation.ReturnCondition.GOOD, LocalDate.now(clock), null);
        loans.saveAndFlush(overdueLoan);

        fineService.finalizeFineOnReturn(overdueLoan);

        Fine finalized = fines.findByLoan_Id(overdueLoan.getId()).orElseThrow();
        assertEquals(5, finalized.getOverdueDays());
        assertEquals(new BigDecimal("50.00"), finalized.getFineAmount());
    }

    @Test
    void dueDateReminderSchedulerSendsNotificationsAndAvoidsDuplicates() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        String bookId = createBook();
        String copyId = createCopy(bookId);

        Book book = books.findById(UUID.fromString(bookId)).orElseThrow();
        BookCopy copy = copies.findById(UUID.fromString(copyId)).orElseThrow();
        copy.update(copy.getCopyIdentifier(), copy.getLocation(), CopyStatus.ON_LOAN);
        copies.saveAndFlush(copy);

        BorrowRequest req = requests.saveAndFlush(new BorrowRequest(student, book, Instant.now()));
        req.decide(RequestDecision.APPROVE, librarian, null, Instant.now());
        req.markIssued();
        requests.saveAndFlush(req);

        // Due tomorrow
        LocalDate today = LocalDate.now(clock);
        LocalDate tomorrow = today.plusDays(1);
        Loan loan = new Loan(req, copy, librarian, today.minusDays(20), tomorrow);
        loans.saveAndFlush(loan);

        // Run scheduler
        int sentFirst = reminderScheduler.sendDueReminders();
        assertTrue(sentFirst >= 1);

        // Check notification exists for student
        var studentNotifications = notificationService.getNotificationsForUser(student.getId(), AccountRole.STUDENT);
        assertFalse(studentNotifications.isEmpty());
        assertTrue(studentNotifications.stream().anyMatch(n -> n.title().contains("Due Tomorrow")));

        // Run scheduler again -> Should not duplicate
        int sentSecond = reminderScheduler.sendDueReminders();
        assertEquals(0, sentSecond);
    }

    private String createBook() throws Exception {
        String u = UUID.randomUUID().toString();
        MvcResult res = mvc.perform(post("/api/v1/books")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "title", "Test book " + u,
                        "authors", new String[]{"Author " + u},
                        "categories", new String[]{"Cat " + u},
                        "circulationPolicy", "STANDARD"
                )))).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
    }

    private String createCopy(String bookId) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/books/" + bookId + "/copies")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "copyIdentifier", "CP-" + UUID.randomUUID()
                )))).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
    }

    private Loan issueLoan(UserAccount student) throws Exception {
        String bookId = createBook();
        String copyId = createCopy(bookId);
        Book book = books.findById(UUID.fromString(bookId)).orElseThrow();
        BookCopy copy = copies.findById(UUID.fromString(copyId)).orElseThrow();
        BorrowRequest request = requests.saveAndFlush(new BorrowRequest(student, book, Instant.now()));
        request.decide(RequestDecision.APPROVE, librarian, null, Instant.now());
        requests.saveAndFlush(request);
        MvcResult result = mvc.perform(post("/api/v1/borrow-requests/" + request.getId() + "/issue")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("copyId", copy.getId()))))
                .andReturn();
        assertEquals(201, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return loans.findById(UUID.fromString(mapper.readTree(result.getResponse().getContentAsString()).get("id").asText())).orElseThrow();
    }

    private Loan createOverdueLoan(UserAccount student, int overdueDays, BigDecimal dailyRate, BigDecimal maximum, int graceDays) throws Exception {
        String bookId = createBook();
        String copyId = createCopy(bookId);
        Book book = books.findById(UUID.fromString(bookId)).orElseThrow();
        BookCopy copy = copies.findById(UUID.fromString(copyId)).orElseThrow();
        copy.update(copy.getCopyIdentifier(), copy.getLocation(), CopyStatus.ON_LOAN);
        copies.saveAndFlush(copy);
        BorrowRequest request = requests.saveAndFlush(new BorrowRequest(student, book, Instant.now()));
        request.decide(RequestDecision.APPROVE, librarian, null, Instant.now());
        request.markIssued();
        requests.saveAndFlush(request);
        LocalDate today = LocalDate.now(clock);
        return loans.saveAndFlush(new Loan(request, copy, librarian,
                today.minusDays(overdueDays + 21L), today.minusDays(overdueDays),
                dailyRate, maximum, graceDays));
    }

    private void setSetting(String key, String value) throws Exception {
        MvcResult result = setSettingResult(key, value);
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
    }

    private MvcResult setSettingResult(String key, String value) throws Exception {
        return mvc.perform(put("/api/v1/librarian/settings/" + key)
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("value", value))))
                .andReturn();
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

    private MockHttpSession login(UserAccount account) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", account.getEmail(), "password", PASSWORD))))
                .andReturn();
        assertEquals(200, r.getResponse().getStatus());
        return (MockHttpSession) r.getRequest().getSession();
    }
}
