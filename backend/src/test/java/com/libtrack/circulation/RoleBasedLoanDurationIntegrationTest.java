package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Instant;
import java.time.LocalDate;
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
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.settings.SystemSetting;
import com.libtrack.settings.SystemSettingRepository;

@LibTrackIntegrationTest
class RoleBasedLoanDurationIntegrationTest {
    private static final String PASSWORD = "SecurePassword@2026!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired BorrowRequestRepository requests;
    @Autowired LoanRepository loans;
    @Autowired LibraryHolidayRepository holidays;
    @Autowired DueDateService dueDates;
    @Autowired SystemSettingRepository settings;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setUp() throws Exception {
        holidays.deleteAll();

        String uid = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(
                UserAccount.initialLibrarian("librarian-" + uid + "@vitap.ac.in", encoder.encode(PASSWORD))
        );
        libSession = login(librarian);

        // Ensure default settings are in place for each test run
        resetSetting("loan.period.student.days", "21");
        resetSetting("loan.period.faculty.days", "30");
        resetSetting("loan.renewal.extension.days", "21");
    }

    private void resetSetting(String key, String value) {
        SystemSetting setting = settings.findById(key)
                .orElseGet(() -> new SystemSetting(key, value, Instant.now(), librarian));
        setting.update(value, Instant.now(), librarian);
        settings.saveAndFlush(setting);
    }

    @Test
    void studentLoanDefaultsTo21EligibleDays() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String bookId = createBook();
        String copyId = createCopy(bookId);
        String reqId = submitRequest(studentSession, bookId);
        approveRequest(reqId);

        MvcResult result = issueLoan(reqId, copyId);
        assertEquals(201, result.getResponse().getStatus());

        JsonNode loan = json(result);
        LocalDate issueDate = LocalDate.parse(loan.get("issueDate").asText());
        LocalDate dueDate = LocalDate.parse(loan.get("dueDate").asText());

        // Issue date is not counted; 21 eligible days added (with non-working day adjustment)
        assertEquals(dueDates.calculateDueDate(issueDate, 21), dueDate);
    }

    @Test
    void facultyLoanDefaultsTo30EligibleDays() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);

        String bookId = createBook();
        String copyId = createCopy(bookId);
        String reqId = submitRequest(facultySession, bookId);
        approveRequest(reqId);

        MvcResult result = issueLoan(reqId, copyId);
        assertEquals(201, result.getResponse().getStatus());

        JsonNode loan = json(result);
        LocalDate issueDate = LocalDate.parse(loan.get("issueDate").asText());
        LocalDate dueDate = LocalDate.parse(loan.get("dueDate").asText());

        // Faculty gets 30 days (with non-working day adjustment)
        assertEquals(dueDates.calculateDueDate(issueDate, 30), dueDate);
    }

    @Test
    void changingStudentDurationDoesNotAffectFacultyDuration() throws Exception {
        // Librarian changes student duration to 14 days
        MvcResult updateResult = updateSetting("loan.period.student.days", "14");
        assertEquals(200, updateResult.getResponse().getStatus());

        // Issue new student loan -> should be 14 days
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String book1 = createBook();
        String copy1 = createCopy(book1);
        String req1 = submitRequest(studentSession, book1);
        approveRequest(req1);
        JsonNode studentLoan = json(issueLoan(req1, copy1));
        LocalDate studentIssue = LocalDate.parse(studentLoan.get("issueDate").asText());
        assertEquals(dueDates.calculateDueDate(studentIssue, 14), LocalDate.parse(studentLoan.get("dueDate").asText()));

        // Issue new faculty loan -> must still be 30 days
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);
        String book2 = createBook();
        String copy2 = createCopy(book2);
        String req2 = submitRequest(facultySession, book2);
        approveRequest(req2);
        JsonNode facultyLoan = json(issueLoan(req2, copy2));
        LocalDate facultyIssue = LocalDate.parse(facultyLoan.get("issueDate").asText());
        assertEquals(dueDates.calculateDueDate(facultyIssue, 30), LocalDate.parse(facultyLoan.get("dueDate").asText()));
    }

    @Test
    void changingFacultyDurationDoesNotAffectStudentDuration() throws Exception {
        // Librarian changes faculty duration to 45 days
        MvcResult updateResult = updateSetting("loan.period.faculty.days", "45");
        assertEquals(200, updateResult.getResponse().getStatus());

        // Issue new faculty loan -> should be 45 days
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);
        String book1 = createBook();
        String copy1 = createCopy(book1);
        String req1 = submitRequest(facultySession, book1);
        approveRequest(req1);
        JsonNode facultyLoan = json(issueLoan(req1, copy1));
        LocalDate facultyIssue = LocalDate.parse(facultyLoan.get("issueDate").asText());
        assertEquals(dueDates.calculateDueDate(facultyIssue, 45), LocalDate.parse(facultyLoan.get("dueDate").asText()));

        // Issue new student loan -> must still be default 21 days
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String book2 = createBook();
        String copy2 = createCopy(book2);
        String req2 = submitRequest(studentSession, book2);
        approveRequest(req2);
        JsonNode studentLoan = json(issueLoan(req2, copy2));
        LocalDate studentIssue = LocalDate.parse(studentLoan.get("issueDate").asText());
        assertEquals(dueDates.calculateDueDate(studentIssue, 21), LocalDate.parse(studentLoan.get("dueDate").asText()));
    }

    @Test
    void existingLoansKeepOriginalDueDatesWhenSettingsChange() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String book = createBook();
        String copy = createCopy(book);
        String req = submitRequest(studentSession, book);
        approveRequest(req);

        JsonNode initialLoan = json(issueLoan(req, copy));
        UUID loanId = UUID.fromString(initialLoan.get("id").asText());
        LocalDate originalDue = LocalDate.parse(initialLoan.get("dueDate").asText());

        // Update student duration setting to 7 days
        updateSetting("loan.period.student.days", "7");

        // Existing loan in DB must remain untouched
        Loan existing = loans.findById(loanId).orElseThrow();
        assertEquals(originalDue, existing.getDueDate());
    }

    @Test
    void holidaysInsideBorrowingPeriodDoNotExtendLoanPeriod() throws Exception {
        LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);
        LocalDate holidayDate = today.plusDays(5);
        holidays.saveAndFlush(new LibraryHoliday(holidayDate, "Campus Festival " + UUID.randomUUID(), librarian));

        // Intermediate holiday does NOT extend the loan period.
        LocalDate expectedStudentDue = dueDates.calculateDueDate(today, 21);
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String book1 = createBook();
        String copy1 = createCopy(book1);
        String req1 = submitRequest(studentSession, book1);
        approveRequest(req1);
        JsonNode studentLoan = json(issueLoan(req1, copy1));
        LocalDate studentDue = LocalDate.parse(studentLoan.get("dueDate").asText());
        assertEquals(expectedStudentDue, studentDue);

        // Faculty loan: uses 30-day duration, intermediate holiday does NOT extend
        LocalDate expectedFacultyDue = dueDates.calculateDueDate(today, 30);
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);
        String book2 = createBook();
        String copy2 = createCopy(book2);
        String req2 = submitRequest(facultySession, book2);
        approveRequest(req2);
        JsonNode facultyLoan = json(issueLoan(req2, copy2));
        LocalDate facultyDue = LocalDate.parse(facultyLoan.get("dueDate").asText());
        assertEquals(expectedFacultyDue, facultyDue);
    }

    @Test
    void renewalAdds21EligibleDaysAndAllowsOnlySingleRenewal() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String book = createBook();
        String copy = createCopy(book);
        String req = submitRequest(studentSession, book);
        approveRequest(req);

        JsonNode loan = json(issueLoan(req, copy));
        String loanId = loan.get("id").asText();
        LocalDate initialDue = LocalDate.parse(loan.get("dueDate").asText());

        // Renew loan
        MvcResult renewed = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                .session(studentSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(200, renewed.getResponse().getStatus());
        JsonNode renewedLoan = json(renewed);
        LocalDate renewedDue = LocalDate.parse(renewedLoan.get("dueDate").asText());
        assertEquals(initialDue.plusDays(21), renewedDue);
        assertEquals(1, renewedLoan.get("renewalCount").asInt());

        // Second renewal attempt must conflict (409)
        MvcResult secondRenew = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                .session(studentSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
        assertEquals(409, secondRenew.getResponse().getStatus());
    }

    @Test
    void settingValidationRejectsInvalidValues() throws Exception {
        // Zero should be rejected
        MvcResult zeroStudent = updateSetting("loan.period.student.days", "0");
        assertEquals(400, zeroStudent.getResponse().getStatus());

        // Negative should be rejected
        MvcResult negativeFaculty = updateSetting("loan.period.faculty.days", "-10");
        assertEquals(400, negativeFaculty.getResponse().getStatus());

        // Non-number should be rejected
        MvcResult invalidStr = updateSetting("loan.period.student.days", "thirty");
        assertEquals(400, invalidStr.getResponse().getStatus());

        // Non-librarian cannot modify settings (403)
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        MvcResult forbiddenResult = mvc.perform(put("/api/v1/librarian/settings/loan.period.student.days")
                .session(studentSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("value", "15"))))
                .andReturn();
        assertEquals(403, forbiddenResult.getResponse().getStatus());
    }

    // --- Helpers ---

    private UserAccount member(AccountRole role) {
        String uid = UUID.randomUUID().toString();
        return accounts.saveAndFlush(
                UserAccount.provisionMember(
                        role.name().toLowerCase() + "-" + uid + "@vitap.ac.in",
                        encoder.encode(PASSWORD),
                        role,
                        role.name() + "-" + uid,
                        librarian.getId(),
                        Instant.now()
                )
        );
    }

    private MockHttpSession login(UserAccount user) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", user.getEmail(), "password", PASSWORD))))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
        return (MockHttpSession) result.getRequest().getSession();
    }

    private String createBook() throws Exception {
        String title = "Test Book " + UUID.randomUUID();
        MvcResult result = mvc.perform(post("/api/v1/books")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "title", title,
                        "authors", new String[]{"Test Author"},
                        "categories", new String[]{"Computer Science"},
                        "circulationPolicy", CirculationPolicy.STANDARD.name()
                ))))
                .andReturn();
        return json(result).get("id").asText();
    }

    private String createCopy(String bookId) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/books/" + bookId + "/copies")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "copyIdentifier", "COPY-" + UUID.randomUUID()
                ))))
                .andReturn();
        return json(result).get("id").asText();
    }

    private String submitRequest(MockHttpSession session, String bookId) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/borrow-requests")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("bookId", bookId))))
                .andReturn();
        return json(result).get("id").asText();
    }

    private void approveRequest(String requestId) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/borrow-requests/" + requestId + "/decision")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("decision", "APPROVE"))))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
    }

    private MvcResult issueLoan(String requestId, String copyId) throws Exception {
        return mvc.perform(post("/api/v1/borrow-requests/" + requestId + "/issue")
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("copyId", copyId))))
                .andReturn();
    }

    private MvcResult updateSetting(String key, String value) throws Exception {
        return mvc.perform(put("/api/v1/librarian/settings/" + key)
                .session(libSession)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("value", value))))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }
}
