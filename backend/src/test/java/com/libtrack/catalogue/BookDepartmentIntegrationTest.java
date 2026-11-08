package com.libtrack.catalogue;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.AccountUserDetails;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@LibTrackIntegrationTest
@Transactional
class BookDepartmentIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private UserAccountRepository accountRepository;
    @Autowired private BookRepository bookRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount cseStudent;
    private UserAccount eceStudent;
    private UserAccount studentWithoutDept;
    private UserAccount librarian;

    @BeforeEach
    void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        librarian = accountRepository.save(UserAccount.initialLibrarian("lib." + suffix + "@vitap.ac.in", "pass123"));

        cseStudent = UserAccount.provisionMember(
                "cs.student." + suffix + "@vitapstudent.ac.in", "pass123", AccountRole.STUDENT, "23BCE" + suffix, librarian.getId(), Instant.now(), "CS Student");
        cseStudent.setDepartment("Computer Science and Engineering");
        cseStudent = accountRepository.save(cseStudent);

        eceStudent = UserAccount.provisionMember(
                "ece.student." + suffix + "@vitapstudent.ac.in", "pass123", AccountRole.STUDENT, "23ECE" + suffix, librarian.getId(), Instant.now(), "ECE Student");
        eceStudent.setDepartment("Electronics and Communication Engineering");
        eceStudent = accountRepository.save(eceStudent);

        studentWithoutDept = UserAccount.provisionMember(
                "nodept." + suffix + "@vitapstudent.ac.in", "pass123", AccountRole.STUDENT, "23NOD" + suffix, librarian.getId(), Instant.now(), "No Dept Student");
        studentWithoutDept.setDepartment(null);
        studentWithoutDept = accountRepository.save(studentWithoutDept);
    }

    @Test
    void librarianCanCreateBookWithOfficialDepartmentAndRetrieveIt() throws Exception {
        BookRequest req = new BookRequest(
                "Algorithms and Data Structures",
                null,
                "Textbook on algorithms",
                "Pearson",
                2023,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Thomas Cormen"),
                List.of("Algorithms"),
                BigDecimal.valueOf(2),
                "Shelf CS-1"
        );

        var res = mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering"))
                .andExpect(jsonPath("$.title").value("Algorithms and Data Structures"))
                .andReturn();

        String bookId = mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering"));
    }

    @Test
    void creationRejectsInvalidDepartment() throws Exception {
        BookRequest req = new BookRequest(
                "Civil Engineering Materials",
                null,
                "Textbook",
                "Pearson",
                2023,
                null,
                CirculationPolicy.STANDARD,
                "Civil Engineering", // Not in official list
                List.of("John Doe"),
                List.of("Civil"),
                BigDecimal.valueOf(1),
                "Shelf 1"
        );

        mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void librarianCanUpdateBookDepartment() throws Exception {
        BookRequest createReq = new BookRequest(
                "Cross-Discipline Robotics",
                null,
                "Robotics book",
                "MIT Press",
                2022,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Alan Turing"),
                List.of("Robotics"),
                BigDecimal.valueOf(1),
                "Shelf 2"
        );

        var res = mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String bookId = mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();

        BookRequest updateReq = new BookRequest(
                "Cross-Discipline Robotics",
                null,
                "Robotics book",
                "MIT Press",
                2022,
                null,
                CirculationPolicy.STANDARD,
                "Mechanical Engineering",
                List.of("Alan Turing"),
                List.of("Robotics"),
                BigDecimal.valueOf(1),
                "Shelf 2"
        );

        mvc.perform(patch("/api/v1/books/{id}", bookId)
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Mechanical Engineering"));
    }

    @Test
    void searchBooksByDepartmentFiltersAccurately() throws Exception {
        BookRequest cseReq = new BookRequest(
                "Compiler Design " + UUID.randomUUID(),
                null,
                "Compiler design",
                "Addison-Wesley",
                2021,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Aho"),
                List.of("Compilers"),
                BigDecimal.valueOf(1),
                null
        );
        mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(cseReq)))
                .andExpect(status().isCreated());

        BookRequest eceReq = new BookRequest(
                "Signals and Systems " + UUID.randomUUID(),
                null,
                "Signals textbook",
                "Wiley",
                2021,
                null,
                CirculationPolicy.STANDARD,
                "Electronics and Communication Engineering",
                List.of("Oppenheim"),
                List.of("Signals"),
                BigDecimal.valueOf(1),
                null
        );
        mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(eceReq)))
                .andExpect(status().isCreated());

        // Query by CSE
        mvc.perform(get("/api/v1/books")
                .param("department", "Computer Science and Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[*].department", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Computer Science and Engineering"))));

        // Query by ECE
        mvc.perform(get("/api/v1/books")
                .param("department", "Electronics and Communication Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[*].department", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Electronics and Communication Engineering"))));
    }

    @Test
    void departmentRecommendationsDerivesFromAuthenticatedSession() throws Exception {
        BookRequest cseReq = new BookRequest(
                "Operating Systems Architecture " + UUID.randomUUID(),
                null,
                "OS concepts",
                "Wiley",
                2024,
                null,
                CirculationPolicy.STANDARD,
                "Computer Science and Engineering",
                List.of("Silberschatz"),
                List.of("OS"),
                BigDecimal.valueOf(1),
                null
        );
        mvc.perform(post("/api/v1/books")
                .with(user(new AccountUserDetails(librarian)))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(cseReq)))
                .andExpect(status().isCreated());

        // Authenticated as CSE student -> derives Computer Science and Engineering
        mvc.perform(get("/api/v1/books/department-recommendations")
                .with(user(new AccountUserDetails(cseStudent))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering"))
                .andExpect(jsonPath("$.books", org.hamcrest.Matchers.not(org.hamcrest.Matchers.empty())))
                .andExpect(jsonPath("$.books.[*].department", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Computer Science and Engineering"))));

        // Testing the recommendations controller endpoint alias
        mvc.perform(get("/api/v1/recommendations/department")
                .with(user(new AccountUserDetails(cseStudent))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Computer Science and Engineering"))
                .andExpect(jsonPath("$.books", org.hamcrest.Matchers.not(org.hamcrest.Matchers.empty())));
    }

    @Test
    void departmentRecommendationsHandlesUserWithoutDepartmentCleanly() throws Exception {
        mvc.perform(get("/api/v1/books/department-recommendations")
                .with(user(new AccountUserDetails(studentWithoutDept))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").doesNotExist())
                .andExpect(jsonPath("$.books").isEmpty());
    }

    @Test
    void unauthenticatedCallsToDepartmentRecommendationsAreRejected() throws Exception {
        mvc.perform(get("/api/v1/books/department-recommendations"))
                .andExpect(status().isUnauthorized());
    }
}
