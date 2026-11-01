package com.libtrack.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
class ReservationLimitAndQueuePromotionIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired BookReservationRepository reservations;
    @Autowired BorrowRequestRepository requests;
    @Autowired LoanRepository loans;
    @Autowired Clock clock;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-res-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
    }

    @Test
    void studentCanReserveUpToFiveBooksAndSixthIsRejected() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession session = login(student);

        // Create 6 books without copies
        List<String> bookIds = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            bookIds.add(book());
        }

        // First 5 reservations succeed
        for (int i = 0; i < 5; i++) {
            MvcResult res = reserve(session, bookIds.get(i));
            assertEquals(201, res.getResponse().getStatus());
        }
        assertEquals(5, reservations.countByStudent_IdAndStatusIn(student.getId(), List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)));

        // Sixth reservation fails
        MvcResult sixth = reserve(session, bookIds.get(5));
        assertEquals(400, sixth.getResponse().getStatus());
        assertTrue(sixth.getResponse().getContentAsString().contains("maximum limit of 5 active reservations"));
    }

    @Test
    void facultyMembersHaveSameReservationLimit() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY);
        MockHttpSession session = login(faculty);

        List<String> bookIds = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            bookIds.add(book());
        }

        // First 5 reservations succeed
        for (int i = 0; i < 5; i++) {
            MvcResult res = reserve(session, bookIds.get(i));
            assertEquals(201, res.getResponse().getStatus());
        }

        // Sixth reservation is rejected
        MvcResult sixth = reserve(session, bookIds.get(5));
        assertEquals(400, sixth.getResponse().getStatus());
        assertTrue(sixth.getResponse().getContentAsString().contains("maximum limit of 5 active reservations"));
    }

    @Test
    void holdPeriodIsOneCalendarMonth() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession session = login(student);

        String b = book();
        reserve(session, b);

        Instant before = clock.instant();
        // Adding copy promotes the reservation to READY_FOR_PICKUP
        String c = copy(b);
        Instant after = clock.instant();

        BookReservation res = reservations.findByStudent_IdOrderByCreatedAtDesc(student.getId()).get(0);
        assertEquals(ReservationStatus.READY_FOR_PICKUP, res.getStatus());
        assertNotNull(res.getHoldExpiresAt());

        Instant expectedHold = before.atZone(clock.getZone()).plusMonths(1).toInstant();
        long diffSeconds = Math.abs(ChronoUnit.SECONDS.between(expectedHold, res.getHoldExpiresAt()));
        assertTrue(diffSeconds < 10, "Hold expiry must be exactly 1 calendar month from promotion");
    }

    @Test
    void addingTwoAvailableCopiesPromotesFirstTwoEligibleReservationsRemainingStaysInQueue() throws Exception {
        UserAccount s1 = member(AccountRole.STUDENT);
        UserAccount s2 = member(AccountRole.STUDENT);
        UserAccount s3 = member(AccountRole.STUDENT);

        String b = book();

        // 3 users reserve Book
        reserve(login(s1), b);
        reserve(login(s2), b);
        reserve(login(s3), b);

        assertEquals(3, reservations.findByBook_IdAndStatusInOrderByCreatedAtAscIdAsc(
                UUID.fromString(b),
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE)
        ).size());

        // Librarian adds 2 copies
        String c1 = copy(b);
        String c2 = copy(b);

        // Check user 1 and user 2 promoted to READY_FOR_PICKUP
        BookReservation res1 = reservations.findByStudent_IdOrderByCreatedAtDesc(s1.getId()).get(0);
        BookReservation res2 = reservations.findByStudent_IdOrderByCreatedAtDesc(s2.getId()).get(0);
        BookReservation res3 = reservations.findByStudent_IdOrderByCreatedAtDesc(s3.getId()).get(0);

        assertEquals(ReservationStatus.READY_FOR_PICKUP, res1.getStatus());
        assertEquals(ReservationStatus.READY_FOR_PICKUP, res2.getStatus());
        assertNotNull(res1.getAssignedCopy());
        assertNotNull(res2.getAssignedCopy());
        assertTrue(!res1.getAssignedCopy().getId().equals(res2.getAssignedCopy().getId()), "Two users cannot have same physical copy");

        // User 3 remains waiting in queue with queue position #1
        assertTrue(res3.getStatus() == ReservationStatus.WAITING_FOR_AVAILABILITY || res3.getStatus() == ReservationStatus.IN_QUEUE);

        // Generated borrowing requests exist in PENDING status for librarian review
        assertNotNull(res1.getBorrowRequest());
        assertEquals(BorrowRequestStatus.PENDING, requests.findById(res1.getBorrowRequest().getId()).orElseThrow().getStatus());
        assertNotNull(res2.getBorrowRequest());
        assertEquals(BorrowRequestStatus.PENDING, requests.findById(res2.getBorrowRequest().getId()).orElseThrow().getStatus());
    }

    @Test
    void librarianCanApproveAndIssuePromotedRequests() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        String b = book();
        reserve(login(student), b);

        String c = copy(b);

        BookReservation res = reservations.findByStudent_IdOrderByCreatedAtDesc(student.getId()).get(0);
        assertEquals(ReservationStatus.READY_FOR_PICKUP, res.getStatus());
        UUID borrowReqId = res.getBorrowRequest().getId();

        // Librarian approves the borrow request
        mvc.perform(post("/api/v1/borrow-requests/" + borrowReqId + "/decision")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("decision", "APPROVE", "reason", "Approved from reservation"))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());

        // Librarian issues the book copy
        MvcResult issueRes = mvc.perform(post("/api/v1/borrow-requests/" + borrowReqId + "/issue")
                        .session(libSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("copyId", c))))
                .andReturn();
        assertEquals(201, issueRes.getResponse().getStatus());

        // Reservation transitions to COMPLETED
        BookReservation completedRes = reservations.findById(res.getId()).orElseThrow();
        assertEquals(ReservationStatus.COMPLETED, completedRes.getStatus());
    }

    @Test
    void returningABookTriggersQueueProcessing() throws Exception {
        UserAccount borrower = member(AccountRole.STUDENT);
        UserAccount reserver = member(AccountRole.STUDENT);

        String b = book();
        String c = copy(b);

        // Issue book to borrower
        String r = json(httpPost(login(borrower), "/api/v1/borrow-requests", Map.of("bookId", b))).get("id").asText();
        httpPost(libSession, "/api/v1/borrow-requests/" + r + "/decision", Map.of("decision", "APPROVE"));
        MvcResult issueRes = httpPost(libSession, "/api/v1/borrow-requests/" + r + "/issue", Map.of("copyId", c));
        assertEquals(201, issueRes.getResponse().getStatus());
        String loanId = json(issueRes).get("id").asText();

        // Now reserver reserves book (since 0 free available)
        reserve(login(reserver), b);
        BookReservation waitingRes = reservations.findByStudent_IdOrderByCreatedAtDesc(reserver.getId()).get(0);
        assertTrue(waitingRes.getStatus() == ReservationStatus.WAITING_FOR_AVAILABILITY || waitingRes.getStatus() == ReservationStatus.IN_QUEUE);

        // Return the book
        MvcResult returnRes = httpPost(libSession, "/api/v1/loans/" + loanId + "/return", Map.of("condition", "GOOD", "note", "Returned intact"));
        assertEquals(200, returnRes.getResponse().getStatus());

        // Reserver's reservation is now promoted to READY_FOR_PICKUP!
        BookReservation promotedRes = reservations.findById(waitingRes.getId()).orElseThrow();
        assertEquals(ReservationStatus.READY_FOR_PICKUP, promotedRes.getStatus());
        assertEquals(UUID.fromString(c), promotedRes.getAssignedCopy().getId());
    }

    @Test
    void cancellingReservationUpdatesQueue() throws Exception {
        UserAccount s1 = member(AccountRole.STUDENT);
        UserAccount s2 = member(AccountRole.STUDENT);

        String b = book();
        reserve(login(s1), b);
        reserve(login(s2), b);

        BookReservation r1 = reservations.findByStudent_IdOrderByCreatedAtDesc(s1.getId()).get(0);
        BookReservation r2 = reservations.findByStudent_IdOrderByCreatedAtDesc(s2.getId()).get(0);

        // Cancel r1
        MvcResult cancelRes = httpPost(login(s1), "/api/v1/reservations/" + r1.getId() + "/cancel", Map.of());
        assertEquals(200, cancelRes.getResponse().getStatus());

        // Get reservations for s2
        MvcResult getRes = mvc.perform(get("/api/v1/reservations/mine").session(login(s2))).andReturn();
        assertEquals(200, getRes.getResponse().getStatus());
        JsonNode list = mapper.readTree(getRes.getResponse().getContentAsString());
        assertEquals(1, list.get(0).get("queuePosition").asLong());
    }

    @Test
    void concurrentReservationRequestsCannotExceedLimit() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession session = login(student);

        // Pre-create 4 reservations
        for (int i = 0; i < 4; i++) {
            reserve(session, book());
        }

        // 2 books
        String b1 = book();
        String b2 = book();

        int concurrency = 2;
        var executor = Executors.newFixedThreadPool(concurrency);
        var startLatch = new CountDownLatch(1);
        List<CompletableFuture<Integer>> futures = new ArrayList<>();

        futures.add(CompletableFuture.supplyAsync(() -> {
            try {
                startLatch.await();
                return reserve(session, b1).getResponse().getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, executor));

        futures.add(CompletableFuture.supplyAsync(() -> {
            try {
                startLatch.await();
                return reserve(session, b2).getResponse().getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, executor));

        startLatch.countDown();
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(10, TimeUnit.SECONDS);

        int ok = 0;
        int rejected = 0;
        for (var f : futures) {
            int status = f.get();
            if (status == 201) ok++;
            else if (status == 400 || status == 409) rejected++;
        }

        executor.shutdown();
        assertEquals(1, ok, "Exactly 1 concurrent reservation should succeed");
        assertEquals(1, rejected, "The other concurrent reservation must be rejected with 400 or 409");
        assertEquals(5, reservations.countByStudent_IdAndStatusIn(student.getId(), List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)));
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

    private String book() throws Exception {
        String u = UUID.randomUUID().toString();
        return json(httpPost(libSession, "/api/v1/books", Map.of(
                "title", "Book " + u,
                "authors", new String[]{"Author " + u},
                "categories", new String[]{"Cat " + u},
                "circulationPolicy", CirculationPolicy.STANDARD.name()
        ))).get("id").asText();
    }

    private String copy(String b) throws Exception {
        return json(httpPost(libSession, "/api/v1/books/" + b + "/copies", Map.of(
                "copyIdentifier", "CP-" + UUID.randomUUID()
        ))).get("id").asText();
    }

    private MvcResult reserve(MockHttpSession s, String bookId) throws Exception {
        return httpPost(s, "/api/v1/reservations", Map.of("bookId", bookId));
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
