package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.AuthorRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.Category;
import com.libtrack.catalogue.CategoryRepository;
import com.libtrack.catalogue.CirculationPolicy;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
class HolidayCalendarAndDueDateCalculationIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired BorrowRequestRepository requests;
    @Autowired LoanRepository loans;
    @Autowired LibraryHolidayRepository holidays;
    @Autowired DueDateService dueDates;
    @Autowired AuthorRepository authors;
    @Autowired CategoryRepository categories;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        holidays.deleteAll();
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-holiday-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
    }

    private UserAccount member(AccountRole role) {
        String t = UUID.randomUUID().toString();
        return accounts.saveAndFlush(UserAccount.provisionMember(
                role.name().toLowerCase() + "-" + t + (role == AccountRole.STUDENT ? "@vitapstudent.ac.in" : "@vitap.ac.in"),
                encoder.encode(PASSWORD),
                role,
                "INST-" + t,
                librarian.getId(),
                Instant.now(),
                "Test " + role.name()
        ));
    }

    private MockHttpSession login(UserAccount account) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", account.getEmail(), "password", PASSWORD))))
                .andReturn();
        assertEquals(200, res.getResponse().getStatus());
        return (MockHttpSession) res.getRequest().getSession();
    }

    private String createBook() {
        String suffix = UUID.randomUUID().toString();
        Author author = authors.saveAndFlush(new Author("Author " + suffix, "author-" + suffix));
        Category category = categories.saveAndFlush(new Category("Cat " + suffix, "cat-" + suffix));
        Book book = books.saveAndFlush(new Book(
                "Book " + suffix,
                "978-" + suffix.substring(0, 8),
                "Desc",
                "Publisher",
                2026,
                null,
                CirculationPolicy.STANDARD,
                Set.of(author),
                Set.of(category)
        ));
        return book.getId().toString();
    }

    private String createCopy(String bookId) {
        Book book = books.findById(UUID.fromString(bookId)).orElseThrow();
        BookCopy copy = copies.saveAndFlush(new BookCopy(book, "CP-" + UUID.randomUUID(), "Shelf 1"));
        return copy.getId().toString();
    }

    private String submitRequest(MockHttpSession memberSession, String bookId) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/borrow-requests")
                        .session(memberSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("bookId", bookId))))
                .andReturn();
        assertEquals(201, res.getResponse().getStatus());
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
    }

    private void approveRequest(String requestId) throws Exception {
        mvc.perform(post("/api/v1/borrow-requests/" + requestId + "/decision")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("decision", "APPROVE", "reason", "Approved"))))
                .andExpect(status().isOk());
    }

    private MvcResult issueLoan(String requestId, String copyId) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/borrow-requests/" + requestId + "/issue")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("copyId", copyId, "note", "Issued"))))
                .andReturn();
        assertEquals(201, res.getResponse().getStatus());
        return res;
    }

    // ==========================================
    // 1. Centralized Due-Date Calculation Unit Scenarios
    // ==========================================

    @Test
    void normalDueDateIsTuesdayNoExtension() {
        // Nov 3, 2026 is Tuesday
        LocalDate tuesday = LocalDate.of(2026, 11, 3);
        assertEquals(DayOfWeek.TUESDAY, tuesday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(tuesday);
        assertEquals(tuesday, adjusted, "Tuesday is a working day, must not extend");
    }

    @Test
    void normalDueDateIsWednesdayNoExtension() {
        // Nov 4, 2026 is Wednesday
        LocalDate wednesday = LocalDate.of(2026, 11, 4);
        assertEquals(DayOfWeek.WEDNESDAY, wednesday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(wednesday);
        assertEquals(wednesday, adjusted, "Wednesday is a working day, must not extend");
    }

    @Test
    void normalDueDateIsSaturdayNoExtension() {
        // Nov 7, 2026 is Saturday
        LocalDate saturday = LocalDate.of(2026, 11, 7);
        assertEquals(DayOfWeek.SATURDAY, saturday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(saturday);
        assertEquals(saturday, adjusted, "Saturday is a working day unless configured as holiday, must not extend");
    }

    @Test
    void normalDueDateIsSundayExtendsToTuesday() {
        // Nov 8, 2026 is Sunday -> extends to Nov 9 (Monday) -> extends to Nov 10 (Tuesday)
        LocalDate sunday = LocalDate.of(2026, 11, 8);
        assertEquals(DayOfWeek.SUNDAY, sunday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(sunday);
        assertEquals(LocalDate.of(2026, 11, 10), adjusted);
        assertEquals(DayOfWeek.TUESDAY, adjusted.getDayOfWeek());
    }

    @Test
    void normalDueDateIsMondayExtendsToTuesday() {
        // Nov 9, 2026 is Monday -> extends to Nov 10 (Tuesday)
        LocalDate monday = LocalDate.of(2026, 11, 9);
        assertEquals(DayOfWeek.MONDAY, monday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(monday);
        assertEquals(LocalDate.of(2026, 11, 10), adjusted);
        assertEquals(DayOfWeek.TUESDAY, adjusted.getDayOfWeek());
    }

    @Test
    void sundayFollowedByMondayExtendsThroughBothDays() {
        // Nov 15, 2026 is Sunday -> Nov 16 (Monday) -> Nov 17 (Tuesday)
        LocalDate sunday = LocalDate.of(2026, 11, 15);
        assertEquals(DayOfWeek.SUNDAY, sunday.getDayOfWeek());

        LocalDate adjusted = dueDates.adjustDueDate(sunday);
        assertEquals(LocalDate.of(2026, 11, 17), adjusted);
    }

    @Test
    void holidayOccursBeforeNormalDueDateDoesNotExtendLoan() {
        // Issue date: Nov 2, 2026 (Monday). Normal 21-day due date: Nov 23, 2026 (Monday) -> Nov 24 (Tuesday)
        // Add holidays in between: Nov 5, Nov 6, Nov 12
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 6), "Mid-term break", librarian));
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 12), LocalDate.of(2026, 11, 12), "Special Holiday", librarian));

        LocalDate issueDate = LocalDate.of(2026, 11, 2);
        LocalDate dueDate = dueDates.calculateDueDate(issueDate, 21);

        // Nov 2 + 21 = Nov 23 (Monday) -> extends to Nov 24 (Tuesday)
        // Intermediate holidays (Nov 5, 6, 12) must NOT be added to loan!
        assertEquals(LocalDate.of(2026, 11, 24), dueDate);
    }

    @Test
    void oneDayHolidayOnNormalDueDateExtendsOneDay() {
        // Normal due date: Nov 4, 2026 (Wednesday). Holiday configured on Nov 4.
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 4), "Staff Day", librarian));

        LocalDate wednesday = LocalDate.of(2026, 11, 4);
        LocalDate adjusted = dueDates.adjustDueDate(wednesday);

        // Nov 4 is holiday -> extends to Nov 5 (Thursday, working day)
        assertEquals(LocalDate.of(2026, 11, 5), adjusted);
        assertEquals(DayOfWeek.THURSDAY, adjusted.getDayOfWeek());
    }

    @Test
    void threeConsecutiveHolidaysOnDueDateExtendsUntilOutsideTheRange() {
        // Nov 4 to Nov 6 are holidays (Wed, Thu, Fri). Normal due date: Nov 4 (Wed)
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 4), LocalDate.of(2026, 11, 6), "Festival Break", librarian));

        LocalDate wednesday = LocalDate.of(2026, 11, 4);
        LocalDate adjusted = dueDates.adjustDueDate(wednesday);

        // Nov 4 (holiday) -> Nov 5 (holiday) -> Nov 6 (holiday) -> Nov 7 (Saturday, valid working day!)
        assertEquals(LocalDate.of(2026, 11, 7), adjusted);
        assertEquals(DayOfWeek.SATURDAY, adjusted.getDayOfWeek());
    }

    @Test
    void extendedDateIsAnotherHolidayContinuesExtending() {
        // Normal due date is Nov 6 (Friday).
        // Holiday 1: Nov 6 (Friday).
        // Holiday 2: Nov 7 (Saturday).
        // Next: Nov 8 (Sunday -> non-working), Nov 9 (Monday -> non-working).
        // Nov 10 (Tuesday) -> valid!
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 6), "Closure 1", librarian));
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 7), "Closure 2", librarian));

        LocalDate friday = LocalDate.of(2026, 11, 6);
        LocalDate adjusted = dueDates.adjustDueDate(friday);

        assertEquals(LocalDate.of(2026, 11, 10), adjusted);
        assertEquals(DayOfWeek.TUESDAY, adjusted.getDayOfWeek());
    }

    @Test
    void holidayRangeIncludesDueDateExtendsCorrectly() {
        // Diwali: Nov 7 to Nov 9 (Saturday to Monday)
        holidays.saveAndFlush(new LibraryHoliday(LocalDate.of(2026, 11, 7), LocalDate.of(2026, 11, 9), "Diwali", librarian));

        // Normal due date on Nov 7 (Sat)
        LocalDate adjusted = dueDates.adjustDueDate(LocalDate.of(2026, 11, 7));
        assertEquals(LocalDate.of(2026, 11, 10), adjusted);

        // Normal due date on Nov 8 (Sun)
        LocalDate adjustedSunday = dueDates.adjustDueDate(LocalDate.of(2026, 11, 8));
        assertEquals(LocalDate.of(2026, 11, 10), adjustedSunday);

        // Normal due date on Nov 9 (Mon)
        LocalDate adjustedMonday = dueDates.adjustDueDate(LocalDate.of(2026, 11, 9));
        assertEquals(LocalDate.of(2026, 11, 10), adjustedMonday);
    }

    // ==========================================
    // 2. Holiday CRUD & Validation End-to-End
    // ==========================================

    @Test
    void fromDateEqualsToDateIsValidSingleDayHoliday() throws Exception {
        LocalDate singleDate = LocalDate.of(2026, 12, 25);
        MvcResult res = mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", singleDate.toString(),
                                "toDate", singleDate.toString(),
                                "name", "Christmas Day"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.durationDays").value(1))
                .andExpect(jsonPath("$.fromDate").value(singleDate.toString()))
                .andExpect(jsonPath("$.toDate").value(singleDate.toString()))
                .andExpect(jsonPath("$.name").value("Christmas Day"))
                .andReturn();

        assertTrue(holidays.isLibraryHoliday(singleDate));
    }

    @Test
    void toDateEarlierThanFromDateIsRejected() throws Exception {
        mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-10",
                                "toDate", "2026-11-08",
                                "name", "Invalid Inverted Range"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void overlappingHolidayRangesAreRejectedWithConflict() throws Exception {
        // Create Diwali: Nov 7 to Nov 9
        mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-07",
                                "toDate", "2026-11-09",
                                "name", "Diwali"
                        ))))
                .andExpect(status().isCreated());

        // Attempt overlapping holiday: Nov 9 to Nov 11
        mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-09",
                                "toDate", "2026-11-11",
                                "name", "Overlapping Event"
                        ))))
                .andExpect(status().isConflict());

        // Attempt holiday inside range: Nov 8
        mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-08",
                                "toDate", "2026-11-08",
                                "name", "Inside Diwali"
                        ))))
                .andExpect(status().isConflict());
    }

    @Test
    void holidayEditedUpdatedRangeAffectsFutureCalculations() throws Exception {
        // Create initial holiday: Nov 4 (Wednesday)
        MvcResult created = mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-04",
                                "toDate", "2026-11-04",
                                "name", "Initial Day"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String id = mapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        // Before edit: Nov 5 is not holiday
        assertFalse(dueDates.isLibraryHoliday(LocalDate.of(2026, 11, 5)));

        // Edit holiday to range Nov 4 to Nov 6
        mvc.perform(put("/api/v1/holidays/" + id)
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-04",
                                "toDate", "2026-11-06",
                                "name", "Extended Break"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationDays").value(3));

        // After edit: Nov 5 is now holiday!
        assertTrue(dueDates.isLibraryHoliday(LocalDate.of(2026, 11, 5)));
        assertEquals(LocalDate.of(2026, 11, 7), dueDates.adjustDueDate(LocalDate.of(2026, 11, 4)));
    }

    @Test
    void holidayDeletedRangeNoLongerAffectsFutureCalculations() throws Exception {
        MvcResult created = mvc.perform(post("/api/v1/holidays")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fromDate", "2026-11-04",
                                "toDate", "2026-11-04",
                                "name", "One Off Closure"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String id = mapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        assertTrue(dueDates.isLibraryHoliday(LocalDate.of(2026, 11, 4)));

        // Delete holiday
        mvc.perform(delete("/api/v1/holidays/" + id)
                        .session(libSession)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertFalse(dueDates.isLibraryHoliday(LocalDate.of(2026, 11, 4)));
        assertEquals(LocalDate.of(2026, 11, 4), dueDates.adjustDueDate(LocalDate.of(2026, 11, 4)));
    }

    // ==========================================
    // 3. Loan Issuance & Renewal Due-Date Verification
    // ==========================================

    @Test
    void studentLoanIssuanceUses21DayDurationAndPersistsCorrectDueDate() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String bookId = createBook();
        String copyId = createCopy(bookId);

        String reqId = submitRequest(studentSession, bookId);
        approveRequest(reqId);

        MvcResult loanRes = issueLoan(reqId, copyId);
        JsonNode loanJson = mapper.readTree(loanRes.getResponse().getContentAsString());
        LocalDate issueDate = LocalDate.parse(loanJson.get("issueDate").asText());
        LocalDate actualDueDate = LocalDate.parse(loanJson.get("dueDate").asText());

        LocalDate expectedDueDate = dueDates.calculateDueDate(issueDate, 21);
        assertEquals(expectedDueDate, actualDueDate);

        // Verify persisted loan record matches in DB
        Loan loan = loans.findById(UUID.fromString(loanJson.get("id").asText())).orElseThrow();
        assertEquals(expectedDueDate, loan.getDueDate());
    }

    @Test
    void facultyLoanIssuanceUsesShared21DayDurationAndPersistsCorrectDueDate() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession facultySession = login(faculty);
        String bookId = createBook();
        String copyId = createCopy(bookId);

        String reqId = submitRequest(facultySession, bookId);
        approveRequest(reqId);

        MvcResult loanRes = issueLoan(reqId, copyId);
        JsonNode loanJson = mapper.readTree(loanRes.getResponse().getContentAsString());
        LocalDate issueDate = LocalDate.parse(loanJson.get("issueDate").asText());
        LocalDate actualDueDate = LocalDate.parse(loanJson.get("dueDate").asText());

        LocalDate expectedDueDate = dueDates.calculateDueDate(issueDate, 21);
        assertEquals(expectedDueDate, actualDueDate);

        Loan loan = loans.findById(UUID.fromString(loanJson.get("id").asText())).orElseThrow();
        assertEquals(expectedDueDate, loan.getDueDate());
    }

    @Test
    void studentRenewalUses21DayExtensionAndAdjustsForNonWorkingDays() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);
        String bookId = createBook();
        String copyId = createCopy(bookId);

        String reqId = submitRequest(studentSession, bookId);
        approveRequest(reqId);

        MvcResult loanRes = issueLoan(reqId, copyId);
        String loanId = mapper.readTree(loanRes.getResponse().getContentAsString()).get("id").asText();
        Loan initialLoan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        LocalDate initialDueDate = initialLoan.getDueDate();

        // Perform renewal
        MvcResult renewRes = mvc.perform(post("/api/v1/loans/" + loanId + "/renew")
                        .session(studentSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();

        LocalDate renewedDueDate = LocalDate.parse(mapper.readTree(renewRes.getResponse().getContentAsString()).get("dueDate").asText());
        LocalDate expectedRenewedDue = dueDates.calculateDueDate(initialDueDate, 21);

        assertEquals(expectedRenewedDue, renewedDueDate);
        Loan updatedLoan = loans.findById(UUID.fromString(loanId)).orElseThrow();
        assertEquals(expectedRenewedDue, updatedLoan.getDueDate());
    }
}
