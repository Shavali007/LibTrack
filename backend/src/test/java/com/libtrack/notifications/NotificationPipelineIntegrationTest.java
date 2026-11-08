package com.libtrack.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

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
import com.libtrack.catalogue.BookRequest;
import com.libtrack.catalogue.CatalogueService;
import com.libtrack.catalogue.Category;
import com.libtrack.catalogue.CategoryRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestCreate;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowingService;
import com.libtrack.circulation.IssueRequest;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.RequestDecision;
import com.libtrack.circulation.RequestDecisionInput;
import com.libtrack.circulation.ReturnCondition;
import com.libtrack.circulation.ReturnRequest;
import com.libtrack.recommendation.CreateRecommendationRequest;
import com.libtrack.recommendation.RecommendationService;

@LibTrackIntegrationTest
@Transactional
class NotificationPipelineIntegrationTest {

    private static final ZoneId KOLKATA_ZONE = ZoneId.of("Asia/Kolkata");

    @Autowired private NotificationService notificationService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserNotificationPreferenceRepository preferenceRepository;
    @Autowired private UserAccountRepository accountRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private BookRepository bookRepository;
    @Autowired private BookCopyRepository copyRepository;
    @Autowired private AuthorRepository authorRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CatalogueService catalogueService;
    @Autowired private BorrowingService borrowingService;
    @Autowired private BorrowRequestRepository borrowRequestRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private DueDateReminderScheduler dueDateReminderScheduler;
    @Autowired private RecommendationService recommendationService;
    @Autowired private Clock clock;

    private UserAccount librarian;
    private UserAccount cseStudent;
    private UserAccount eceStudent;
    private UserAccount faculty;
    private Book bookCse;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        librarian = accountRepository.save(UserAccount.initialLibrarian(
                "lib." + suffix + "@vitap.ac.in", encoder.encode("Pass123!")));

        cseStudent = accountRepository.save(UserAccount.provisionMember(
                "cse." + suffix + "@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "23CSE" + suffix,
                librarian.getId(),
                Instant.now(),
                "CSE Student"
        ));
        cseStudent.setDepartment("Computer Science and Engineering (CSE)");
        cseStudent = accountRepository.save(cseStudent);

        eceStudent = accountRepository.save(UserAccount.provisionMember(
                "ece." + suffix + "@vitapstudent.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.STUDENT,
                "23ECE" + suffix,
                librarian.getId(),
                Instant.now(),
                "ECE Student"
        ));
        eceStudent.setDepartment("Electronics and Communication Engineering (ECE)");
        eceStudent = accountRepository.save(eceStudent);

        faculty = accountRepository.save(UserAccount.provisionMember(
                "faculty." + suffix + "@vitap.ac.in",
                encoder.encode("Pass123!"),
                AccountRole.FACULTY,
                "FAC" + suffix,
                librarian.getId(),
                Instant.now(),
                "Dr. Faculty"
        ));
        faculty.setDepartment("Computer Science and Engineering (CSE)");
        faculty = accountRepository.save(faculty);

        Author author = authorRepository.findByNormalizedName("author test")
                .orElseGet(() -> authorRepository.save(new Author("Author Test", "author test")));
        Category category = categoryRepository.findByNormalizedName("tech")
                .orElseGet(() -> categoryRepository.save(new Category("Tech", "tech")));

        String isbn = "978" + String.format("%010d", Math.abs(suffix.hashCode() % 1000000000L));
        bookCse = bookRepository.save(new Book(
                "Algorithms and Structures",
                isbn,
                "Algorithms description",
                "Tech Press",
                2023,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering (CSE)",
                Set.of(author),
                Set.of(category)
        ));
    }

    private void setAuth(UserAccount user) {
        var userDetails = new AccountUserDetails(user);
        var token = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(token);
    }

    @Test
    @DisplayName("1. Borrowing workflow: no self-notifications on submit and return; notifies on decision and issue")
    void testBorrowingNotificationRules() {
        // Create an available copy for the book
        BookCopy copy = copyRepository.save(new BookCopy(bookCse, "BAR-" + UUID.randomUUID().toString().substring(0, 8), "Main Stacks"));

        // Submit borrow request as student -> borrower should NOT receive any notification
        setAuth(cseStudent);
        var requestRecord = borrowingService.submit(cseStudent.getId(), new BorrowRequestCreate(bookCse.getId()));
        assertNotNull(requestRecord);

        Page<NotificationRecord> studentNotificationsAfterSubmit = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(studentNotificationsAfterSubmit.getContent())
                .noneMatch(n -> n.title().contains("Borrow Request Submitted"));

        // Decision as librarian: Approve request -> borrower should receive approval notification
        setAuth(librarian);
        borrowingService.decide(requestRecord.id(), librarian.getId(), new RequestDecisionInput(RequestDecision.APPROVE, "Approved for pickup"));

        Page<NotificationRecord> afterDecision = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(afterDecision.getContent())
                .anyMatch(n -> n.title().contains("Borrow Request Approved") && "BORROW_REQUEST".equals(n.category()));

        // Issue book as librarian -> borrower should receive Book Issued notification
        var loanRecord = borrowingService.issue(requestRecord.id(), librarian.getId(), new IssueRequest(copy.getId(), "Issued to student"));
        assertNotNull(loanRecord);

        Page<NotificationRecord> afterIssue = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(afterIssue.getContent())
                .anyMatch(n -> n.title().contains("Book Issued") && "BORROW_REQUEST".equals(n.category()));

        // Record Return as librarian -> borrower should NOT receive a "Book Returned" notification
        int notifCountBeforeReturn = afterIssue.getContent().size();
        borrowingService.recordReturn(loanRecord.id(), librarian.getId(), new ReturnRequest(ReturnCondition.GOOD, "Returned clean"));

        Page<NotificationRecord> afterReturn = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(afterReturn.getContent())
                .noneMatch(n -> n.title().contains("Book Returned"));
        assertThat(afterReturn.getContent().size()).isEqualTo(notifCountBeforeReturn);
    }

    @Test
    @DisplayName("2. Due date reminder scheduler: sends only 1 day before and on due date; no 3-day; no duplicates; no returned loans")
    void testDueDateReminderSchedulerRules() {
        LocalDate today = LocalDate.now(clock.withZone(KOLKATA_ZONE));
        Instant now = Instant.now(clock);

        BookCopy copy1 = copyRepository.save(new BookCopy(bookCse, "BAR-DUE-1", "Main Stacks"));
        copy1.update(copy1.getCopyIdentifier(), copy1.getLocation(), CopyStatus.ON_LOAN);
        copyRepository.save(copy1);

        BookCopy copy2 = copyRepository.save(new BookCopy(bookCse, "BAR-DUE-2", "Main Stacks"));
        copy2.update(copy2.getCopyIdentifier(), copy2.getLocation(), CopyStatus.ON_LOAN);
        copyRepository.save(copy2);

        BookCopy copy3 = copyRepository.save(new BookCopy(bookCse, "BAR-DUE-3", "Main Stacks"));
        copy3.update(copy3.getCopyIdentifier(), copy3.getLocation(), CopyStatus.ON_LOAN);
        copyRepository.save(copy3);

        BookCopy copy4 = copyRepository.save(new BookCopy(bookCse, "BAR-DUE-4", "Main Stacks"));

        BorrowRequest req1 = borrowRequestRepository.save(new BorrowRequest(cseStudent, bookCse, now));
        BorrowRequest req2 = borrowRequestRepository.save(new BorrowRequest(cseStudent, bookCse, now));
        BorrowRequest req3 = borrowRequestRepository.save(new BorrowRequest(cseStudent, bookCse, now));
        BorrowRequest req4 = borrowRequestRepository.save(new BorrowRequest(cseStudent, bookCse, now));

        // Loan 1: Due tomorrow (1 day before) -> Should receive reminder
        Loan loanDueTomorrow = new Loan(req1, copy1, librarian, today.minusDays(10), today.plusDays(1));
        loanRepository.save(loanDueTomorrow);

        // Loan 2: Due today -> Should receive reminder
        Loan loanDueToday = new Loan(req2, copy2, librarian, today.minusDays(10), today);
        loanRepository.save(loanDueToday);

        // Loan 3: Due in 3 days -> Should NOT receive reminder
        Loan loanDue3Days = new Loan(req3, copy3, librarian, today.minusDays(7), today.plusDays(3));
        loanRepository.save(loanDue3Days);

        // Loan 4: Returned loan due today -> Should NOT receive reminder
        Loan returnedLoan = new Loan(req4, copy4, librarian, today.minusDays(10), today);
        returnedLoan.returnCopy(ReturnCondition.GOOD, today, "Returned");
        loanRepository.save(returnedLoan);

        // Run scheduler
        int sent = dueDateReminderScheduler.sendDueReminders();
        assertThat(sent).isEqualTo(2);

        Page<NotificationRecord> notifications = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );

        assertThat(notifications.getContent())
                .anyMatch(n -> n.title().contains("Due Tomorrow") && "DUE_DATE".equals(n.category()));
        assertThat(notifications.getContent())
                .anyMatch(n -> n.title().contains("Due Today") && "DUE_DATE".equals(n.category()));
        assertThat(notifications.getContent())
                .noneMatch(n -> n.title().contains("in 3 days") || n.message().contains("3 days"));

        // Rerun scheduler on the same day -> Must be idempotent, 0 new notifications
        int sentSecondRun = dueDateReminderScheduler.sendDueReminders();
        assertThat(sentSecondRun).isEqualTo(0);
    }

    @Test
    @DisplayName("3. New book arrivals: sends department notification to matching students/faculty and general to others; excludes librarian; suppresses on update")
    void testNewBookArrivalNotifications() {
        notificationRepository.deleteAll();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String isbn = "978" + String.format("%010d", Math.abs((suffix + "9").hashCode() % 1000000000L));
        BookRequest req = new BookRequest(
                "Advanced Operating Systems",
                isbn,
                "Comprehensive systems guide",
                "Academic Press",
                2024,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering (CSE)",
                List.of("Prof. Tanenbaum"),
                List.of("Computer Science"),
                BigDecimal.ONE,
                "Main Stacks"
        );

        setAuth(librarian);
        var created = catalogueService.createBook(req);
        assertNotNull(created);

        // Librarian should NOT receive notification
        Page<NotificationRecord> libNotifs = notificationService.getNotificationsForUser(
                librarian.getId(), librarian.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(libNotifs.getContent()).noneMatch(n -> n.title().contains("Advanced Operating Systems"));

        // CSE Student should receive DEPARTMENT_BOOK_ARRIVAL notification
        Page<NotificationRecord> cseNotifs = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(cseNotifs.getContent())
                .anyMatch(n -> n.title().contains("New books for your department")
                        && "DEPARTMENT_BOOK_ARRIVAL".equals(n.category()));
        // Ensure no duplicate general arrival notification for CSE Student
        long arrivalNotifsForCse = cseNotifs.getContent().stream()
                .filter(n -> n.message().contains("Advanced Operating Systems"))
                .count();
        assertThat(arrivalNotifsForCse).isEqualTo(1);

        // ECE Student should receive general NEW_BOOK_ARRIVAL notification
        Page<NotificationRecord> eceNotifs = notificationService.getNotificationsForUser(
                eceStudent.getId(), eceStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(eceNotifs.getContent())
                .anyMatch(n -> n.title().contains("New Book Added")
                        && "NEW_BOOK_ARRIVAL".equals(n.category()));

        // Updating the book should NOT dispatch new notifications
        int eceCountBeforeUpdate = eceNotifs.getContent().size();
        BookRequest updateReq = new BookRequest(
                "Advanced Operating Systems (2nd Ed)",
                isbn,
                "Comprehensive systems guide updated",
                "Academic Press",
                2024,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering (CSE)",
                List.of("Prof. Tanenbaum"),
                List.of("Computer Science"),
                BigDecimal.ONE,
                "Main Stacks"
        );
        catalogueService.updateBook(created.id(), updateReq);

        Page<NotificationRecord> eceNotifsAfterUpdate = notificationService.getNotificationsForUser(
                eceStudent.getId(), eceStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(eceNotifsAfterUpdate.getContent().size()).isEqualTo(eceCountBeforeUpdate);
    }

    @Test
    @DisplayName("4. Recommendations: respects individual preference, suppresses when off, excludes recommending faculty")
    void testRecommendationNotificationPreferences() {
        notificationRepository.deleteAll();

        // Turn OFF recommendation notifications for cseStudent
        UserNotificationPreference csePref = preferenceRepository.findByUserAccountId(cseStudent.getId())
                .orElseGet(() -> new UserNotificationPreference(cseStudent));
        csePref.setBookRecommendations(false);
        preferenceRepository.save(csePref);

        // Ensure eceStudent has recommendation ON
        UserNotificationPreference ecePref = preferenceRepository.findByUserAccountId(eceStudent.getId())
                .orElseGet(() -> new UserNotificationPreference(eceStudent));
        ecePref.setBookRecommendations(true);
        preferenceRepository.save(ecePref);

        // Faculty creates recommendation
        setAuth(faculty);
        CreateRecommendationRequest recReq = new CreateRecommendationRequest(
                bookCse.getId(),
                "Highly recommended for mastering algorithms"
        );
        var recResponse = recommendationService.createRecommendation(faculty.getId(), recReq);
        assertNotNull(recResponse);

        // Recommending faculty member should NOT receive notification
        Page<NotificationRecord> facNotifs = notificationService.getNotificationsForUser(
                faculty.getId(), faculty.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(facNotifs.getContent()).noneMatch(n -> n.title().contains("Recommended for You"));

        // CSE Student (preference = false) should NOT receive notification
        Page<NotificationRecord> cseNotifs = notificationService.getNotificationsForUser(
                cseStudent.getId(), cseStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(cseNotifs.getContent()).noneMatch(n -> n.title().contains("Recommended for You"));

        // ECE Student (preference = true) SHOULD receive notification
        Page<NotificationRecord> eceNotifs = notificationService.getNotificationsForUser(
                eceStudent.getId(), eceStudent.getRole(), "ALL", "LATEST", 0, 10
        );
        assertThat(eceNotifs.getContent())
                .anyMatch(n -> n.title().contains("Recommended for You")
                        && "RECOMMENDATION".equals(n.category()));
    }
}
