package com.libtrack.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.RequestDecision;
import com.libtrack.reservation.BookReservation;
import com.libtrack.reservation.BookReservationRepository;
import com.libtrack.reservation.ReservationStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@LibTrackIntegrationTest
@Transactional
class TrendingBooksIntegrationTest {
    @Autowired MockMvc mvc;
    private final ObjectMapper mapper = new ObjectMapper();
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired BorrowRequestRepository requests;
    @Autowired LoanRepository loans;
    @Autowired BookReservationRepository reservations;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired Clock clock;

    private UserAccount librarian;
    private UserAccount member;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("trend-lib-" + suffix + "@example.edu", encoder.encode("Sufficiently Long Test Password 1!")));
        member = accounts.saveAndFlush(UserAccount.provisionMember("trend-member-" + suffix + "@example.edu", encoder.encode("Sufficiently Long Test Password 1!"),
                AccountRole.STUDENT, "TREND-" + suffix, librarian.getId(), Instant.now()));
    }

    @Test
    void publicTrendingRanksIssuedLoansThenActiveReservationsThenDirectRequestsWithoutDoubleCounting() throws Exception {
        Book issuedBook = createBook("A issued " + UUID.randomUUID());
        Book reservationBook = createBook("B reservation " + UUID.randomUUID());
        Book directBook = createBook("C request " + UUID.randomUUID());
        Book rejectedBook = createBook("D rejected " + UUID.randomUUID());
        Book inactiveBook = createBook("E inactive " + UUID.randomUUID());

        issue(issuedBook, LocalDate.now(clock));
        BookCopy heldCopy = copies.saveAndFlush(new BookCopy(reservationBook, "TR-" + UUID.randomUUID(), "A-1"));
        BorrowRequest promotedRequest = approvedRequest(reservationBook, member, Instant.now(clock));
        BookReservation promotedReservation = new BookReservation(reservationBook, member, ReservationStatus.WAITING_FOR_AVAILABILITY, Instant.now(clock));
        promotedReservation.assignCopyAndHold(heldCopy, promotedRequest, Instant.now(clock), Instant.now(clock).plusSeconds(3600));
        reservations.saveAndFlush(promotedReservation);
        requests.saveAndFlush(new BorrowRequest(member, directBook, Instant.now(clock)));
        BorrowRequest rejected = new BorrowRequest(member, rejectedBook, Instant.now(clock));
        rejected.decide(RequestDecision.REJECT, librarian, "Not eligible", Instant.now(clock));
        requests.saveAndFlush(rejected);
        requests.saveAndFlush(new BorrowRequest(member, inactiveBook, Instant.now(clock)));
        inactiveBook.deactivate();
        books.saveAndFlush(inactiveBook);

        mvc.perform(get("/api/v1/books/trending").param("days", "30").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].id").value(issuedBook.getId().toString()))
                .andExpect(jsonPath("$.content[0].trendingScore").value(3))
                .andExpect(jsonPath("$.content[0].issuedLoanCount").value(1))
                .andExpect(jsonPath("$.content[1].id").value(reservationBook.getId().toString()))
                .andExpect(jsonPath("$.content[1].trendingScore").value(2))
                .andExpect(jsonPath("$.content[1].activeReservationCount").value(1))
                .andExpect(jsonPath("$.content[1].directRequestCount").value(0))
                .andExpect(jsonPath("$.content[2].id").value(directBook.getId().toString()))
                .andExpect(jsonPath("$.content[2].trendingScore").value(1));
    }

    @Test
    void excludesOldLoansCancelledAndExpiredReservationsAndDoesNotCountRenewalAgain() throws Exception {
        Book oldLoanBook = createBook("Old loan " + UUID.randomUUID());
        Book renewedLoanBook = createBook("Renewed loan " + UUID.randomUUID());
        Book cancelledBook = createBook("Cancelled reservation " + UUID.randomUUID());
        Book expiredBook = createBook("Expired reservation " + UUID.randomUUID());

        issue(oldLoanBook, LocalDate.now(clock).minusDays(31));
        Loan renewed = issue(renewedLoanBook, LocalDate.now(clock));
        renewed.renew(renewed.getDueDate().plusDays(7));
        loans.saveAndFlush(renewed);
        BookReservation cancelled = new BookReservation(cancelledBook, member, ReservationStatus.WAITING_FOR_AVAILABILITY, Instant.now(clock));
        cancelled.cancel(Instant.now(clock));
        reservations.saveAndFlush(cancelled);
        BookReservation expired = new BookReservation(expiredBook, member, ReservationStatus.WAITING_FOR_AVAILABILITY, Instant.now(clock));
        expired.expire(Instant.now(clock));
        reservations.saveAndFlush(expired);

        var result = mvc.perform(get("/api/v1/books/trending").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(renewedLoanBook.getId().toString()))
                .andExpect(jsonPath("$.content[0].trendingScore").value(3))
                .andExpect(jsonPath("$.content[0].issuedLoanCount").value(1))
                .andReturn();
        JsonNode content = mapper.readTree(result.getResponse().getContentAsString()).path("content");
        assertThat(content.toString()).doesNotContain(oldLoanBook.getId().toString(), cancelledBook.getId().toString(), expiredBook.getId().toString());
    }

    @Test
    void sortsEquivalentScoresByTitleAndValidatesPublicRequestBounds() throws Exception {
        Book alpha = createBook("Alpha trend " + UUID.randomUUID());
        Book zulu = createBook("Zulu trend " + UUID.randomUUID());
        requests.saveAndFlush(new BorrowRequest(member, zulu, Instant.now(clock)));
        requests.saveAndFlush(new BorrowRequest(member, alpha, Instant.now(clock)));

        mvc.perform(get("/api/v1/books/trending").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(alpha.getId().toString()))
                .andExpect(jsonPath("$.content[1].id").value(zulu.getId().toString()));
        mvc.perform(get("/api/v1/books/trending").param("days", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/books/trending").param("limit", "101")).andExpect(status().isBadRequest());
    }

    private Book createBook(String title) throws Exception {
        String isbn = isbnFor(title);
        var result = mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("title", title, "isbn", isbn, "authors", new String[] {"Trend Author"},
                                "categories", new String[] {"Trend"}, "circulationPolicy", "STANDARD"))))
                .andExpect(status().isCreated()).andReturn();
        UUID id = UUID.fromString(mapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
        return books.findById(id).orElseThrow();
    }

    private Loan issue(Book book, LocalDate issueDate) {
        BookCopy copy = copies.saveAndFlush(new BookCopy(book, "TR-" + UUID.randomUUID(), "A-1"));
        BorrowRequest request = approvedRequest(book, member, Instant.now(clock));
        copy.update(copy.getCopyIdentifier(), copy.getLocation(), CopyStatus.ON_LOAN);
        copies.saveAndFlush(copy);
        request.markIssued();
        requests.saveAndFlush(request);
        return loans.saveAndFlush(new Loan(request, copy, librarian, issueDate, issueDate.plusDays(14)));
    }

    private BorrowRequest approvedRequest(Book book, UserAccount borrower, Instant submittedAt) {
        BorrowRequest request = new BorrowRequest(borrower, book, submittedAt);
        request.decide(RequestDecision.APPROVE, librarian, null, Instant.now(clock));
        return requests.saveAndFlush(request);
    }

    private String isbnFor(String input) {
        String digits = Integer.toUnsignedString(input.hashCode()).replaceAll("[^0-9]", "");
        String prefix = "978" + (digits + "000000000").substring(0, 9);
        int sum = 0;
        for (int index = 0; index < 12; index++) sum += (prefix.charAt(index) - '0') * (index % 2 == 0 ? 1 : 3);
        return prefix + ((10 - sum % 10) % 10);
    }
}
