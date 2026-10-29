package com.libtrack.fines;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
    @Autowired private FineService fineService;
    @Autowired private DueDateReminderScheduler reminderScheduler;
    @Autowired private NotificationService notificationService;
    @Autowired private Clock clock;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        String uid = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-fine-" + uid + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
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
