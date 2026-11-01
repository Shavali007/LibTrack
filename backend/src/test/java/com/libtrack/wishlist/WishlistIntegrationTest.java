package com.libtrack.wishlist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
class WishlistIntegrationTest {

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
    private WishlistRepository wishlistRepository;

    @Autowired
    private WishlistService wishlistService;

    private UserAccount student1;
    private UserAccount student2;
    private UserAccount faculty1;
    private Book bookA;
    private Book bookB;

    @BeforeEach
    void setUp() {
        wishlistRepository.deleteAll();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount librarian = accountRepository.saveAndFlush(
                UserAccount.initialLibrarian("lib-" + suffix + "@vitap.ac.in", encoder.encode(PASSWORD))
        );

        student1 = accountRepository.saveAndFlush(
                UserAccount.provisionMember(
                        "student1-" + suffix + "@vitapstudent.ac.in",
                        encoder.encode(PASSWORD),
                        AccountRole.STUDENT,
                        "STU1-" + suffix,
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
                        "FAC1-" + suffix,
                        librarian.getId(),
                        Instant.now(),
                        "Dr. Rao Manmadha"
                )
        );

        Author author = authorRepository.findByNormalizedName("joshua-bloch-" + suffix)
                .orElseGet(() -> authorRepository.saveAndFlush(new Author("Joshua Bloch", "joshua-bloch-" + suffix)));

        Category category = categoryRepository.findByNormalizedName("programming-" + suffix)
                .orElseGet(() -> categoryRepository.saveAndFlush(new Category("Programming", "programming-" + suffix)));

        bookA = bookRepository.saveAndFlush(new Book(
                "Effective Java " + suffix,
                null,
                "Best practices for Java",
                "Addison-Wesley",
                2018,
                "https://example.com/java.jpg",
                CirculationPolicy.STANDARD,
                Set.of(author),
                Set.of(category)
        ));

        bookB = bookRepository.saveAndFlush(new Book(
                "Clean Code " + suffix,
                null,
                "Craftsman Handbook",
                "Prentice Hall",
                2008,
                "https://example.com/clean.jpg",
                CirculationPolicy.STANDARD,
                Set.of(author),
                Set.of(category)
        ));

        copyRepository.saveAndFlush(new BookCopy(bookA, "EJ-01-" + suffix, "Shelf A"));
        copyRepository.saveAndFlush(new BookCopy(bookA, "EJ-02-" + suffix, "Shelf A"));
    }

    private MockHttpSession sessionFor(UserAccount account) {
        AccountUserDetails details = new AccountUserDetails(account);
        Authentication auth = new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return session;
    }

    @Test
    void unauthenticatedRequestRejected() throws Exception {
        mvc.perform(get("/api/v1/wishlist"))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/wishlist/" + bookA.getId()).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCanAddBookToWishlist() throws Exception {
        MockHttpSession session = sessionFor(student1);

        mvc.perform(post("/api/v1/wishlist/" + bookA.getId())
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId").value(bookA.getId().toString()))
                .andExpect(jsonPath("$.title").value(bookA.getTitle()))
                .andExpect(jsonPath("$.availableCopies").value(2))
                .andExpect(jsonPath("$.available").value(true));

        assertThat(wishlistRepository.existsByUserIdAndBookId(student1.getId(), bookA.getId())).isTrue();
    }

    @Test
    void facultyCanAddBookToWishlist() throws Exception {
        MockHttpSession session = sessionFor(faculty1);

        mvc.perform(post("/api/v1/wishlist/" + bookB.getId())
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId").value(bookB.getId().toString()))
                .andExpect(jsonPath("$.title").value(bookB.getTitle()));

        assertThat(wishlistRepository.existsByUserIdAndBookId(faculty1.getId(), bookB.getId())).isTrue();
    }

    @Test
    void duplicateAdditionIsHandledSafely() throws Exception {
        MockHttpSession session = sessionFor(student1);

        // First add
        mvc.perform(post("/api/v1/wishlist/" + bookA.getId())
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isCreated());

        // Duplicate add
        mvc.perform(post("/api/v1/wishlist/" + bookA.getId())
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId").value(bookA.getId().toString()));

        // Exactly one item exists in repository
        assertThat(wishlistRepository.findByUserIdOrderByCreatedAtDesc(student1.getId())).hasSize(1);
    }

    @Test
    void userCanRetrieveTheirWishlist() throws Exception {
        MockHttpSession session = sessionFor(student1);
        wishlistService.addToWishlist(student1.getId(), bookA.getId());
        wishlistService.addToWishlist(student1.getId(), bookB.getId());

        mvc.perform(get("/api/v1/wishlist").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].bookId").exists())
                .andExpect(jsonPath("$[0].averageRating").value(0.0))
                .andExpect(jsonPath("$[0].reviewCount").value(0));
    }

    @Test
    void userCanRemoveSavedBook() throws Exception {
        MockHttpSession session = sessionFor(student1);
        wishlistService.addToWishlist(student1.getId(), bookA.getId());
        assertThat(wishlistRepository.existsByUserIdAndBookId(student1.getId(), bookA.getId())).isTrue();

        mvc.perform(delete("/api/v1/wishlist/" + bookA.getId())
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(wishlistRepository.existsByUserIdAndBookId(student1.getId(), bookA.getId())).isFalse();
    }

    @Test
    void accountIsolationGuaranteed() throws Exception {
        // Student 1 adds bookA
        wishlistService.addToWishlist(student1.getId(), bookA.getId());

        // Student 2 accesses their wishlist -> should be empty
        MockHttpSession session2 = sessionFor(student2);
        mvc.perform(get("/api/v1/wishlist").session(session2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Student 2 attempts to remove bookA -> should not affect Student 1's wishlist
        mvc.perform(delete("/api/v1/wishlist/" + bookA.getId())
                        .session(session2)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(wishlistRepository.existsByUserIdAndBookId(student1.getId(), bookA.getId())).isTrue();
    }

    @Test
    void checkWishlistStatusReturnsAccurateMap() throws Exception {
        MockHttpSession session = sessionFor(student1);
        wishlistService.addToWishlist(student1.getId(), bookA.getId());

        mvc.perform(get("/api/v1/wishlist/status")
                        .param("bookIds", bookA.getId().toString() + "," + bookB.getId().toString())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['" + bookA.getId() + "']").value(true))
                .andExpect(jsonPath("$['" + bookB.getId() + "']").value(false));
    }

    @Test
    void batchReviewSummariesEndpointReturnsActualData() throws Exception {
        mvc.perform(get("/api/v1/books/reviews/summaries")
                        .param("bookIds", bookA.getId().toString() + "," + bookB.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].totalReviews").value(0))
                .andExpect(jsonPath("$[0].reviewCount").value(0))
                .andExpect(jsonPath("$[1].totalReviews").value(0))
                .andExpect(jsonPath("$[1].reviewCount").value(0));
    }
}
