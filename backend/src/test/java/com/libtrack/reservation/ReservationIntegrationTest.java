package com.libtrack.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.ApprovalStatus;
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
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowingService;
import com.libtrack.circulation.IssueRequest;
import com.libtrack.circulation.RequestDecision;
import com.libtrack.circulation.RequestDecisionInput;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.ReturnCondition;
import com.libtrack.circulation.ReturnRequest;
import com.libtrack.notifications.NotificationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@LibTrackIntegrationTest
@Transactional
class ReservationIntegrationTest {

    private static final String PASSWORD = "TestPassword123!";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accountRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private AuthorRepository authorRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BookCopyRepository copyRepository;

    @Autowired
    private BorrowRequestRepository requestRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private BookReservationRepository reservationRepository;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private BorrowingService borrowingService;

    @Autowired
    private NotificationRepository notificationRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;
    private UserAccount student1;
    private UserAccount student2;
    private UserAccount student3;
    private UserAccount faculty1;
    private Book bookUnavailable;
    private Book bookWithAvailableCopy;
    private BookCopy copyOnLoan;
    private BookCopy copyAvailable;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        librarian = accountRepository.saveAndFlush(
                UserAccount.initialLibrarian("lib-" + suffix + "@vitap.ac.in", encoder.encode(PASSWORD))
        );

        student1 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "std1-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "23ST1" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Student One"
                )
        );

        student2 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "std2-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "23ST2" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Student Two"
                )
        );

        student3 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "std3-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "23ST3" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Student Three"
                )
        );

        faculty1 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "fac-" + suffix + "@vitap.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.FACULTY,
                        "23FAC" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Faculty User"
                )
        );

        Author author = authorRepository.findByNormalizedName("abraham-silberschatz")
                .orElseGet(() -> authorRepository.saveAndFlush(new Author("Abraham Silberschatz", "abraham-silberschatz")));
        Category category = categoryRepository.findByNormalizedName("computer-science")
                .orElseGet(() -> categoryRepository.saveAndFlush(new Category("Computer Science", "computer-science")));

        bookUnavailable = bookRepository.saveAndFlush(
                new Book(
                        "Operating System Concepts " + suffix,
                        "978111806333" + suffix.substring(0, 1),
                        "OS fundamentals",
                        "Wiley",
                        2022,
                        "https://example.com/os.jpg",
                        CirculationPolicy.STANDARD,
                        Set.of(author),
                        Set.of(category)
                )
        );

        copyOnLoan = copyRepository.saveAndFlush(
                new BookCopy(bookUnavailable, "CP-OS-" + suffix, "Shelf-1")
        );
        copyOnLoan.update(copyOnLoan.getCopyIdentifier(), copyOnLoan.getLocation(), CopyStatus.ON_LOAN);
        copyRepository.saveAndFlush(copyOnLoan);

        // Put copy on loan to someone else so availableCopies = 0
        BorrowRequest seedReq = requestRepository.saveAndFlush(new BorrowRequest(faculty1, bookUnavailable, Instant.now()));
        loanRepository.saveAndFlush(new Loan(seedReq, copyOnLoan, librarian, LocalDate.now().minusDays(5), LocalDate.now().plusDays(10)));

        bookWithAvailableCopy = bookRepository.saveAndFlush(
                new Book(
                        "Database Concepts " + suffix,
                        "978111806334" + suffix.substring(0, 1),
                        "Database systems",
                        "Wiley",
                        2021,
                        "https://example.com/db.jpg",
                        CirculationPolicy.STANDARD,
                        Set.of(author),
                        Set.of(category)
                )
        );
        copyAvailable = copyRepository.saveAndFlush(
                new BookCopy(bookWithAvailableCopy, "CP-DB-" + suffix, "Shelf-2")
        );
    }

    private MockHttpSession sessionFor(UserAccount account) {
        MockHttpSession session = new MockHttpSession();
        AccountUserDetails userDetails = new AccountUserDetails(account);
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return session;
    }

    @Test
    void studentCanReserveUnavailableBook() throws Exception {
        MockHttpSession session = sessionFor(student1);

        CreateReservationRequest req = new CreateReservationRequest(bookUnavailable.getId());

        mvc.perform(post("/api/v1/reservations")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId").value(bookUnavailable.getId().toString()))
                .andExpect(jsonPath("$.queuePosition").value(1))
                .andExpect(jsonPath("$.status").value("WAITING_FOR_AVAILABILITY"))
                .andExpect(jsonPath("$.statusDisplay").value("Waiting for Availability"))
                .andExpect(jsonPath("$.canCancel").value(true));

        assertThat(reservationRepository.existsByBook_IdAndStudent_IdAndStatusIn(
                bookUnavailable.getId(), student1.getId(), List.of(ReservationStatus.WAITING_FOR_AVAILABILITY)
        )).isTrue();
    }

    @Test
    void studentCannotReserveBookWhenCopyIsImmediatelyAvailable() throws Exception {
        MockHttpSession session = sessionFor(student1);

        CreateReservationRequest req = new CreateReservationRequest(bookWithAvailableCopy.getId());

        mvc.perform(post("/api/v1/reservations")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BOOK_NOT_RESERVABLE"));
    }

    @Test
    void studentCannotCreateDuplicateActiveReservation() throws Exception {
        MockHttpSession session = sessionFor(student1);
        CreateReservationRequest req = new CreateReservationRequest(bookUnavailable.getId());

        mvc.perform(post("/api/v1/reservations")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/reservations")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_RESERVATION"));
    }

    @Test
    void facultyCanCreateReservationWhenEligible() throws Exception {
        UserAccount faculty2 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "fac2-" + UUID.randomUUID().toString().substring(0, 8) + "@vitap.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.FACULTY,
                        "23FAC" + UUID.randomUUID().toString().substring(0, 4),
                        librarian.getId(),
                        Instant.now(),
                        "Faculty User 2"
                )
        );
        MockHttpSession session = sessionFor(faculty2);
        CreateReservationRequest req = new CreateReservationRequest(bookUnavailable.getId());

        mvc.perform(post("/api/v1/reservations")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("WAITING_FOR_AVAILABILITY"));
    }

    @Test
    void fifoQueueMaintainsPriorityAndRecalculatesOnCancellation() throws Exception {
        // Student 1 reserves -> position #1
        ReservationResponse r1 = reservationService.createReservation(student1.getId(), new CreateReservationRequest(bookUnavailable.getId()));
        assertThat(r1.queuePosition()).isEqualTo(1L);
        assertThat(r1.status()).isEqualTo(ReservationStatus.WAITING_FOR_AVAILABILITY);

        // Student 2 reserves -> position #2
        ReservationResponse r2 = reservationService.createReservation(student2.getId(), new CreateReservationRequest(bookUnavailable.getId()));
        assertThat(r2.queuePosition()).isEqualTo(2L);

        // Student 3 reserves -> position #3
        ReservationResponse r3 = reservationService.createReservation(student3.getId(), new CreateReservationRequest(bookUnavailable.getId()));
        assertThat(r3.queuePosition()).isEqualTo(3L);

        // When Student 1 cancels, positions for Student 2 and 3 should update
        reservationService.cancelReservation(student1.getId(), r1.id());

        List<ReservationResponse> mine2 = reservationService.getMyReservations(student2.getId(), "all");
        assertThat(mine2.get(0).queuePosition()).isEqualTo(1L);

        List<ReservationResponse> mine3 = reservationService.getMyReservations(student3.getId(), "all");
        assertThat(mine3.get(0).queuePosition()).isEqualTo(2L);
    }

    @Test
    void automaticQueueProcessingAssignsAvailableCopyAndTransitionsToReadyForPickup() throws Exception {
        // Student 1 reserves unavailable book
        ReservationResponse r1 = reservationService.createReservation(student1.getId(), new CreateReservationRequest(bookUnavailable.getId()));
        assertThat(r1.status()).isEqualTo(ReservationStatus.WAITING_FOR_AVAILABILITY);

        // Set security context to librarian to perform return
        AccountUserDetails libDetails = new AccountUserDetails(librarian);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(libDetails, null, libDetails.getAuthorities())
        );

        // Return the copy in GOOD condition -> copy becomes AVAILABLE
        Loan seedLoan = loanRepository.findAll().stream()
                .filter(l -> l.getCopy().getId().equals(copyOnLoan.getId()))
                .findFirst().orElseThrow();

        borrowingService.recordReturn(seedLoan.getId(), librarian.getId(), new ReturnRequest(ReturnCondition.GOOD, "Returned in clean state"));

        // Check that reservation automatically moved to READY_FOR_PICKUP with 48h hold
        BookReservation updated = reservationRepository.findById(r1.id()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(ReservationStatus.READY_FOR_PICKUP);
        assertThat(updated.getAssignedCopy()).isNotNull();
        assertThat(updated.getAssignedCopy().getId()).isEqualTo(copyOnLoan.getId());
        assertThat(updated.getHoldExpiresAt()).isNotNull();
        assertThat(updated.getBorrowRequest()).isNotNull();

        // Verify Student 1 views Ready for Pickup in mine list
        MockHttpSession session = sessionFor(student1);
        mvc.perform(get("/api/v1/reservations/mine").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].statusDisplay").value("Ready for Pickup"))
                .andExpect(jsonPath("$[0].canBorrowNow").value(true));

        // When Librarian approves and issues this request at Circulation Desk
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(libDetails, null, libDetails.getAuthorities())
        );
        borrowingService.decide(updated.getBorrowRequest().getId(), librarian.getId(), new RequestDecisionInput(RequestDecision.APPROVE, "Approved reservation"));
        borrowingService.issue(updated.getBorrowRequest().getId(), librarian.getId(), new IssueRequest(copyOnLoan.getId(), "Issued at circulation desk"));

        // Reservation should now be COMPLETED
        BookReservation completed = reservationRepository.findById(r1.id()).orElseThrow();
        assertThat(completed.getStatus()).isEqualTo(ReservationStatus.COMPLETED);
    }

    @Test
    void overdueHoldExpiresAndReleasesCopy() throws Exception {
        // Reserve book
        ReservationResponse r1 = reservationService.createReservation(student1.getId(), new CreateReservationRequest(bookUnavailable.getId()));

        AccountUserDetails libDetails = new AccountUserDetails(librarian);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(libDetails, null, libDetails.getAuthorities())
        );

        // Return copy to trigger assignment
        Loan seedLoan = loanRepository.findAll().stream()
                .filter(l -> l.getCopy().getId().equals(copyOnLoan.getId()))
                .findFirst().orElseThrow();
        borrowingService.recordReturn(seedLoan.getId(), librarian.getId(), new ReturnRequest(ReturnCondition.GOOD, "Return copy"));

        BookReservation held = reservationRepository.findById(r1.id()).orElseThrow();
        assertThat(held.getStatus()).isEqualTo(ReservationStatus.READY_FOR_PICKUP);

        // Fast-forward hold expiration by artificially setting holdExpiresAt to past
        held.assignCopyAndHold(held.getAssignedCopy(), held.getBorrowRequest(), Instant.now().minusSeconds(180000), Instant.now().minusSeconds(100));
        reservationRepository.saveAndFlush(held);

        // Run expiration job
        reservationService.expireOverdueHolds();

        BookReservation expired = reservationRepository.findById(r1.id()).orElseThrow();
        assertThat(expired.getStatus()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(expired.getAssignedCopy()).isNull();
    }

    @Test
    void studentCannotCancelAnotherStudentsReservation() throws Exception {
        ReservationResponse r1 = reservationService.createReservation(student1.getId(), new CreateReservationRequest(bookUnavailable.getId()));

        MockHttpSession sessionStudent2 = sessionFor(student2);

        mvc.perform(post("/api/v1/reservations/" + r1.id() + "/cancel")
                        .session(sessionStudent2)
                        .with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED_ACTION"));
    }

    @Test
    void countsEndpointReturnsAccurateTabCounts() throws Exception {
        MockHttpSession session = sessionFor(student1);

        mvc.perform(get("/api/v1/reservations/counts").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.all").value(0))
                .andExpect(jsonPath("$.waiting").value(0));

        reservationService.createReservation(student1.getId(), new CreateReservationRequest(bookUnavailable.getId()));

        mvc.perform(get("/api/v1/reservations/counts").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.all").value(1))
                .andExpect(jsonPath("$.waiting").value(1));
    }
}
