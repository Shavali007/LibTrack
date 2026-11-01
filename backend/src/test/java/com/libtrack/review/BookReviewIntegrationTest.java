package com.libtrack.review;

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
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
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
class BookReviewIntegrationTest {

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
    private BookReviewRepository reviewRepository;

    @Autowired
    private DigitalEditionAccessRepository digitalAccessRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;
    private UserAccount student1;
    private UserAccount student2;
    private UserAccount faculty1;
    private Book book1;
    private BookCopy copy1;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        librarian = accountRepository.saveAndFlush(
                UserAccount.initialLibrarian("lib-" + suffix + "@vitap.ac.in", encoder.encode(PASSWORD))
        );

        student1 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "student1-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "STU-" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Ananya R."
                )
        );

        student2 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "student2-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "STU2-" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Rohit S."
                )
        );

        faculty1 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "faculty1-" + suffix + "@vitap.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.FACULTY,
                        "FAC-" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Dr. Rao Manmadha"
                )
        );

        Author author = authorRepository.findByNormalizedName("herbert-schildt")
                .orElseGet(() -> authorRepository.saveAndFlush(new Author("Herbert Schildt", "herbert-schildt")));

        Category category = categoryRepository.findByNormalizedName("programming")
                .orElseGet(() -> categoryRepository.saveAndFlush(new Category("Programming", "programming")));

        book1 = bookRepository.saveAndFlush(
                new Book(
                        "Java: The Complete Reference " + suffix,
                        "97800" + suffix,
                        "Authoritative guide to Java",
                        "McGraw-Hill",
                        2024,
                        "https://example.com/cover.jpg",
                        CirculationPolicy.STANDARD,
                        Set.of(author),
                        Set.of(category)
                )
        );

        copy1 = copyRepository.saveAndFlush(
                new BookCopy(book1, "CP-" + suffix, "Shelf-A")
        );
    }

    private MockHttpSession sessionFor(UserAccount account) {
        MockHttpSession session = new MockHttpSession();
        AccountUserDetails userDetails = new AccountUserDetails(account);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return session;
    }

    private void establishLoanFor(UserAccount user, BookCopy copy) {
        BorrowRequest req = requestRepository.saveAndFlush(
                new BorrowRequest(user, copy.getBook(), Instant.now())
        );
        loanRepository.saveAndFlush(
                new Loan(req, copy, librarian, LocalDate.now().minusDays(10), LocalDate.now().plusDays(10))
        );
    }

    private void establishDigitalAccessFor(UserAccount user, Book book, DigitalAccessType accessType) {
        digitalAccessRepository.saveAndFlush(
                new DigitalEditionAccess(book, user, accessType)
        );
    }

    @Test
    void eligibleStudentCanSubmitReview() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/eligibility").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.hasBorrowHistory").value(true))
                .andExpect(jsonPath("$.hasDigitalAccess").value(true))
                .andExpect(jsonPath("$.alreadyReviewed").value(false));

        CreateBookReviewRequest request = new CreateBookReviewRequest(
                5, "Very useful for learning Java. Covers concepts clearly with good examples."
        );

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comment").value("Very useful for learning Java. Covers concepts clearly with good examples."))
                .andExpect(jsonPath("$.reviewerName").value("Ananya R."));

        assertThat(reviewRepository.existsByBookIdAndReviewerId(book1.getId(), student1.getId())).isTrue();
    }

    @Test
    void eligibleFacultyCanSubmitReview() throws Exception {
        establishLoanFor(faculty1, copy1);
        establishDigitalAccessFor(faculty1, book1, DigitalAccessType.DOWNLOAD);

        MockHttpSession session = sessionFor(faculty1);

        CreateBookReviewRequest request = new CreateBookReviewRequest(
                4, "A comprehensive reference for Java. The explanations are simple and easy to follow."
        );

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(4))
                .andExpect(jsonPath("$.reviewerName").value("Dr. Rao Manmadha"));
    }

    @Test
    void userWithOnlyBorrowHistoryIsEligible() throws Exception {
        // Has loan history, but no digital edition access -> ELIGIBLE
        establishLoanFor(student1, copy1);

        MockHttpSession session = sessionFor(student1);

        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/eligibility").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.hasBorrowHistory").value(true))
                .andExpect(jsonPath("$.hasDigitalAccess").value(false));

        CreateBookReviewRequest request = new CreateBookReviewRequest(5, "Reviewed based on physical borrow history alone.");

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comment").value("Reviewed based on physical borrow history alone."));
    }

    @Test
    void userWithOnlyDigitalAccessIsEligible() throws Exception {
        // Has digital access, but no borrow history -> ELIGIBLE
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/eligibility").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.hasBorrowHistory").value(false))
                .andExpect(jsonPath("$.hasDigitalAccess").value(true));

        CreateBookReviewRequest request = new CreateBookReviewRequest(4, "Reviewed based on digital access alone.");

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(4))
                .andExpect(jsonPath("$.comment").value("Reviewed based on digital access alone."));
    }

    @Test
    void userWithoutAnyBorrowOrDigitalAccessIsRejectedWith403() throws Exception {
        // No borrow history and no digital access -> INELIGIBLE
        MockHttpSession session = sessionFor(student1);

        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/eligibility").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.hasBorrowHistory").value(false))
                .andExpect(jsonPath("$.hasDigitalAccess").value(false))
                .andExpect(jsonPath("$.reason").value("You can review this book after borrowing it or accessing its digital edition."));

        CreateBookReviewRequest request = new CreateBookReviewRequest(5, "Trying to review without borrowing or digital access");

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INELIGIBLE_REVIEW"))
                .andExpect(jsonPath("$.message").value("You can review this book after borrowing it or accessing its digital edition."));
    }

    @Test
    void duplicateReviewIsRejectedWith409() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        CreateBookReviewRequest first = new CreateBookReviewRequest(5, "First review");
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        CreateBookReviewRequest second = new CreateBookReviewRequest(4, "Second attempt");
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(second)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_REVIEW"))
                .andExpect(jsonPath("$.message").value("You have already reviewed this book."));
    }

    @Test
    void ratingValidationRejectsInvalidRatings() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        CreateBookReviewRequest zeroRating = new CreateBookReviewRequest(0, "Invalid 0 rating");
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(zeroRating)))
                .andExpect(status().isBadRequest());

        CreateBookReviewRequest sixRating = new CreateBookReviewRequest(6, "Invalid 6 rating");
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(sixRating)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void whitespaceOnlyCommentIsRejectedWith400() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        CreateBookReviewRequest whitespace = new CreateBookReviewRequest(4, "     ");
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(whitespace)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingCommentIsRejectedWith400() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        CreateBookReviewRequest noComment = new CreateBookReviewRequest(5, null);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(noComment)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void commentExceeding1000CharsIsRejectedWith400() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);

        MockHttpSession session = sessionFor(student1);

        String longComment = "A".repeat(1001);
        CreateBookReviewRequest tooLong = new CreateBookReviewRequest(4, longComment);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(tooLong)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void commentUpTo1000CharsIsAccepted() throws Exception {
        establishLoanFor(student1, copy1);
        MockHttpSession session = sessionFor(student1);

        String comment1000 = "B".repeat(1000);
        CreateBookReviewRequest validMax = new CreateBookReviewRequest(5, comment1000);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(validMax)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.comment").value(comment1000));
    }

    @Test
    void unauthenticatedUserCannotSubmitReview() throws Exception {
        CreateBookReviewRequest request = new CreateBookReviewRequest(5, "Unauthenticated review attempt");

        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void summaryCalculatesAverageRatingAndTotalCount() throws Exception {
        // Before reviews
        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(0))
                .andExpect(jsonPath("$.averageRating").doesNotExist());

        // Student 1 leaves rating 5
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(sessionFor(student1))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateBookReviewRequest(5, "Rating 5"))))
                .andExpect(status().isCreated());

        // Student 2 leaves rating 4
        BookCopy copy2 = copyRepository.saveAndFlush(new BookCopy(book1, "CP-2-" + UUID.randomUUID(), "Shelf-B"));
        establishLoanFor(student2, copy2);
        establishDigitalAccessFor(student2, book1, DigitalAccessType.READ_ONLINE);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(sessionFor(student2))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateBookReviewRequest(4, "Rating 4"))))
                .andExpect(status().isCreated());

        // Average = (5 + 4) / 2 = 4.5
        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(2))
                .andExpect(jsonPath("$.averageRating").value(4.5));
    }

    @Test
    void getReviewsReturnsPaginatedNewestFirstWithoutExposingPrivateInfo() throws Exception {
        establishLoanFor(student1, copy1);
        establishDigitalAccessFor(student1, book1, DigitalAccessType.READ_ONLINE);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(sessionFor(student1))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateBookReviewRequest(5, "Review 1"))))
                .andExpect(status().isCreated());

        BookCopy copy2 = copyRepository.saveAndFlush(new BookCopy(book1, "CP-3-" + UUID.randomUUID(), "Shelf-C"));
        establishLoanFor(student2, copy2);
        establishDigitalAccessFor(student2, book1, DigitalAccessType.DOWNLOAD);
        mvc.perform(post("/api/v1/books/" + book1.getId() + "/reviews")
                        .session(sessionFor(student2))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateBookReviewRequest(4, "Review 2 - Newer"))))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/books/" + book1.getId() + "/reviews?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].comment").value("Review 2 - Newer"))
                .andExpect(jsonPath("$.content[0].reviewerName").value("Rohit S."))
                .andExpect(jsonPath("$.content[0].email").doesNotExist())
                .andExpect(jsonPath("$.content[0].institutionalId").doesNotExist())
                .andExpect(jsonPath("$.content[1].comment").value("Review 1"))
                .andExpect(jsonPath("$.content[1].reviewerName").value("Ananya R."));
    }
}
