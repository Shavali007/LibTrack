package com.libtrack.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@LibTrackIntegrationTest
@Transactional
class RecommendationIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserAccountRepository accountRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private AuthorRepository authorRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BookRecommendationRepository recommendationRepository;

    @Autowired
    private BookRecommendationHelpfulRepository helpfulRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount faculty1;
    private UserAccount faculty2;
    private UserAccount student1;
    private UserAccount student2;
    private UserAccount librarian;
    private Book book1;
    private Book book2;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        librarian = accountRepository.save(UserAccount.initialLibrarian("librarian." + suffix + "@vitap.ac.in", "pass123"));

        faculty1 = UserAccount.provisionMember(
                "rao." + suffix + "@vitap.ac.in", "pass123", AccountRole.FACULTY, "FAC101" + suffix, librarian.getId(), Instant.now(), "Dr. Rao Manmadha");
        faculty1.setDepartment("Computer Science");
        faculty1 = accountRepository.save(faculty1);

        faculty2 = UserAccount.provisionMember(
                "anil." + suffix + "@vitap.ac.in", "pass123", AccountRole.FACULTY, "FAC102" + suffix, librarian.getId(), Instant.now(), "Prof. Anil Kumar");
        faculty2.setDepartment("Computer Science");
        faculty2 = accountRepository.save(faculty2);

        student1 = accountRepository.save(UserAccount.provisionMember(
                "student1." + suffix + "@vitapstudent.ac.in", "pass123", AccountRole.STUDENT, "23BCE1001" + suffix, librarian.getId(), Instant.now(), "Student One"));

        student2 = accountRepository.save(UserAccount.provisionMember(
                "student2." + suffix + "@vitapstudent.ac.in", "pass123", AccountRole.STUDENT, "23BCE1002" + suffix, librarian.getId(), Instant.now(), "Student Two"));

        Author author1 = authorRepository.findByNormalizedName("robert c. martin")
                .orElseGet(() -> authorRepository.save(new Author("Robert C. Martin", "robert c. martin")));
        Category cat1 = categoryRepository.findByNormalizedName("computer science")
                .orElseGet(() -> categoryRepository.save(new Category("Computer Science", "computer science")));
        Author author2 = authorRepository.findByNormalizedName("joshua bloch")
                .orElseGet(() -> authorRepository.save(new Author("Joshua Bloch", "joshua bloch")));

        String isbnSuffix1 = String.format("%09d", Math.abs((suffix + "1").hashCode() % 1000000000L));
        String isbnSuffix2 = String.format("%09d", Math.abs((suffix + "2").hashCode() % 1000000000L));

        book1 = bookRepository.save(new Book("Clean Code", "978" + isbnSuffix1 + "1", "A handbook of agile craftsmanship",
                "Prentice Hall", 2008, "https://example.com/cleancode.jpg", CirculationPolicy.STANDARD, Set.of(author1), Set.of(cat1)));

        book2 = bookRepository.save(new Book("Effective Java", "978" + isbnSuffix2 + "2", "Best practices for Java",
                "Addison-Wesley", 2018, "https://example.com/effectivejava.jpg", CirculationPolicy.STANDARD, Set.of(author2), Set.of(cat1)));
    }

    @Test
    void facultyCanRecommendBookAndRetrieveInMyRecommendations() throws Exception {
        CreateRecommendationRequest req = new CreateRecommendationRequest(book1.getId(), "A must-read for writing clean code.");

        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookTitle").value("Clean Code"))
                .andExpect(jsonPath("$.facultyName").value("Dr. Rao Manmadha"))
                .andExpect(jsonPath("$.facultyDepartment").value("Computer Science"))
                .andExpect(jsonPath("$.message").value("A must-read for writing clean code."))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.helpfulCount").value(0))
                .andExpect(jsonPath("$.markedHelpful").value(false));

        mvc.perform(get("/api/v1/recommendations/mine")
                        .with(user(new AccountUserDetails(faculty1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].bookTitle").value("Clean Code"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    @Test
    void messageValidationEnforces300CharsAndRejectsWhitespaceOnly() throws Exception {
        // Whitespace only
        CreateRecommendationRequest wsReq = new CreateRecommendationRequest(book1.getId(), "    ");
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(wsReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RECOMMENDATION"));

        // Exceeds 300 characters
        String tooLong = "a".repeat(301);
        CreateRecommendationRequest longReq = new CreateRecommendationRequest(book1.getId(), tooLong);
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(longReq)))
                .andExpect(status().isBadRequest());

        // Empty / null message is allowed (optional field)
        CreateRecommendationRequest emptyReq = new CreateRecommendationRequest(book1.getId(), null);
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(emptyReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").doesNotExist());
    }

    @Test
    void duplicateActiveRecommendationBySameFacultyIsRejected() throws Exception {
        CreateRecommendationRequest req = new CreateRecommendationRequest(book1.getId(), "Recommended book.");

        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Second submission for same book by same faculty fails with 409 Conflict
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_RECOMMENDATION"));
    }

    @Test
    void studentCannotCreateRecommendation() throws Exception {
        CreateRecommendationRequest req = new CreateRecommendationRequest(book1.getId(), "Student attempt.");
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(student1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void recommendingNonExistentBookReturnsNotFound() throws Exception {
        CreateRecommendationRequest req = new CreateRecommendationRequest(UUID.randomUUID(), "Nonexistent book.");
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOOK_NOT_FOUND"));
    }

    @Test
    void facultyCanEditOnlyOwnRecommendationMessage() throws Exception {
        CreateRecommendationRequest createReq = new CreateRecommendationRequest(book1.getId(), "Initial message");
        String res = mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID recId = UUID.fromString(mapper.readTree(res).get("id").asText());

        // Faculty 2 tries to edit Faculty 1's recommendation -> 403 Forbidden
        UpdateRecommendationRequest updateReq = new UpdateRecommendationRequest("Tampered message");
        mvc.perform(put("/api/v1/recommendations/" + recId)
                        .with(user(new AccountUserDetails(faculty2)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());

        // Faculty 1 edits own message -> succeeds
        UpdateRecommendationRequest validUpdate = new UpdateRecommendationRequest("Updated insightful message");
        mvc.perform(put("/api/v1/recommendations/" + recId)
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(validUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Updated insightful message"));
    }

    @Test
    void facultyCanWithdrawRecommendationAndItIsHiddenFromStudentFeed() throws Exception {
        CreateRecommendationRequest createReq = new CreateRecommendationRequest(book1.getId(), "To be withdrawn");
        String res = mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID recId = UUID.fromString(mapper.readTree(res).get("id").asText());

        // Visible in student feed before withdrawal
        mvc.perform(get("/api/v1/recommendations/faculty")
                        .with(user(new AccountUserDetails(student1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Faculty 1 withdraws
        mvc.perform(post("/api/v1/recommendations/" + recId + "/withdraw")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"));

        // Hidden from student feed after withdrawal
        mvc.perform(get("/api/v1/recommendations/faculty")
                        .with(user(new AccountUserDetails(student1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Preserved in faculty's own list with status WITHDRAWN
        mvc.perform(get("/api/v1/recommendations/mine")
                        .with(user(new AccountUserDetails(faculty1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("WITHDRAWN"));

        // Faculty 1 can re-recommend the same book after withdrawal
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Fresh recommendation"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void multipleFacultyCanRecommendSameBookAndGroupedCorrectly() throws Exception {
        // Faculty 1 recommends Clean Code
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Faculty 1 message"))))
                .andExpect(status().isCreated());

        // Faculty 2 also recommends Clean Code
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty2)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Faculty 2 message"))))
                .andExpect(status().isCreated());

        // Student feed: one book card for Clean Code with totalRecommendations = 2
        mvc.perform(get("/api/v1/recommendations/faculty")
                        .with(user(new AccountUserDetails(student1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].bookTitle").value("Clean Code"))
                .andExpect(jsonPath("$[0].totalRecommendations").value(2))
                .andExpect(jsonPath("$[0].recommendations.length()").value(2));
    }

    @Test
    void studentHelpfulInteractionWorkflow() throws Exception {
        CreateRecommendationRequest createReq = new CreateRecommendationRequest(book1.getId(), "Great book");
        String res = mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID recId = UUID.fromString(mapper.readTree(res).get("id").asText());

        // Student 1 marks helpful -> count = 1, markedHelpful = true
        mvc.perform(post("/api/v1/recommendations/" + recId + "/helpful")
                        .with(user(new AccountUserDetails(student1)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.helpfulCount").value(1))
                .andExpect(jsonPath("$.markedHelpful").value(true));

        // Duplicate submission by Student 1 does not increment count
        mvc.perform(post("/api/v1/recommendations/" + recId + "/helpful")
                        .with(user(new AccountUserDetails(student1)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.helpfulCount").value(1))
                .andExpect(jsonPath("$.markedHelpful").value(true));

        // Student 2 also marks helpful -> count = 2
        mvc.perform(post("/api/v1/recommendations/" + recId + "/helpful")
                        .with(user(new AccountUserDetails(student2)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.helpfulCount").value(2));

        // Student 1 removes helpful -> count = 1, markedHelpful = false
        mvc.perform(delete("/api/v1/recommendations/" + recId + "/helpful")
                        .with(user(new AccountUserDetails(student1)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.helpfulCount").value(1))
                .andExpect(jsonPath("$.markedHelpful").value(false));

        // Faculty cannot mark helpful (only students can react)
        mvc.perform(post("/api/v1/recommendations/" + recId + "/helpful")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void librarianCanViewAllFacultyRecommendationsReadOnly() throws Exception {
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Librarian test"))))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/recommendations/all")
                        .with(user(new AccountUserDetails(librarian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].facultyName").value("Dr. Rao Manmadha"))
                .andExpect(jsonPath("$[0].bookTitle").value("Clean Code"));

        // Librarian cannot create recommendations
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(librarian)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book2.getId(), "Librarian attempt"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void recommendedBookIdsEndpointReturnsDistinctActiveIds() throws Exception {
        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty1)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Msg 1"))))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/recommendations")
                        .with(user(new AccountUserDetails(faculty2)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new CreateRecommendationRequest(book1.getId(), "Msg 2"))))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/recommendations/recommended-book-ids")
                        .with(user(new AccountUserDetails(student1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]").value(book1.getId().toString()));
    }
}
