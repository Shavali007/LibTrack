package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:libtrack-tz-test;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "libtrack.library-zone=Asia/Kolkata"
})
@Transactional
class BorrowingIssueDateAndTimezoneIntegrationTest {
    private static final String PASSWORD = "Sufficiently Long Test Password 1!";
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired BorrowRequestRepository requests;
    @Autowired LoanRepository loans;
    @Autowired DueDateService dueDates;
    @Autowired Clock clock;

    private final ObjectMapper mapper = new ObjectMapper();
    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        assertEquals(IST, clock.getZone());
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
    }

    @Test
    void loanIssuedNearMidnightDisplaysConsistentIstDateAcrossAllEndpoints() throws Exception {
        UserAccount student = member(AccountRole.STUDENT);
        MockHttpSession studentSession = login(student);

        String bookId = book();
        String copyId = copy(bookId);

        // 1. Student submits borrow request
        String reqId = submit(studentSession, bookId);

        // 2. Librarian approves request
        approve(reqId);

        // 3. Librarian issues copy
        MvcResult issueResult = postJson(libSession, "/api/v1/borrow-requests/" + reqId + "/issue", Map.of("copyId", copyId));
        assertEquals(201, issueResult.getResponse().getStatus());
        JsonNode loanJson = json(issueResult);

        // The issue date in response must equal today in Asia/Kolkata
        LocalDate expectedLocalDate = LocalDate.now(clock);
        LocalDate returnedIssueDate = LocalDate.parse(loanJson.get("issueDate").asText());
        assertEquals(expectedLocalDate, returnedIssueDate);

        // Due date calculation starts from expected local date
        LocalDate expectedDueDate = dueDates.calculateDueDate(expectedLocalDate, 21);
        assertEquals(expectedDueDate, LocalDate.parse(loanJson.get("dueDate").asText()));

        // 4. Verify Active Loans in Circulation Desk
        MvcResult activeLoansResult = mvc.perform(get("/api/v1/loans?page=0&size=10").session(libSession)).andReturn();
        assertEquals(200, activeLoansResult.getResponse().getStatus());
        JsonNode activeList = json(activeLoansResult).get("content");
        JsonNode activeItem = null;
        for (JsonNode n : activeList) {
            if (n.get("id").asText().equals(loanJson.get("id").asText())) {
                activeItem = n;
                break;
            }
        }
        assertNotNull(activeItem);
        assertEquals(expectedLocalDate.toString(), activeItem.get("issueDate").asText());

        // 5. Verify Borrow Request History
        MvcResult requestResult = mvc.perform(get("/api/v1/borrow-requests/mine").session(studentSession)).andReturn();
        assertEquals(200, requestResult.getResponse().getStatus());
        JsonNode reqNode = json(requestResult).get("content").get(0);
        JsonNode historyEvents = reqNode.get("history");
        JsonNode issuedEvent = null;
        for (JsonNode ev : historyEvents) {
            if ("ISSUED".equals(ev.get("eventType").asText())) {
                issuedEvent = ev;
                break;
            }
        }
        assertNotNull(issuedEvent);
        Instant occurredAt = Instant.parse(issuedEvent.get("occurredAt").asText());
        LocalDate occurredLocalDate = LocalDate.ofInstant(occurredAt, IST);
        assertEquals(expectedLocalDate, occurredLocalDate, "Borrow request event timestamp converted to IST must match loan issue date");

        // 6. Verify Member's Own Loans
        MvcResult myLoansResult = mvc.perform(get("/api/v1/loans/mine").session(studentSession)).andReturn();
        assertEquals(200, myLoansResult.getResponse().getStatus());
        JsonNode myLoanItem = json(myLoansResult).get("content").get(0);
        assertEquals(expectedLocalDate.toString(), myLoanItem.get("issueDate").asText());
    }

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
        return json(postJson(libSession, "/api/v1/books", Map.of(
            "title", "Timezone Test Book " + u,
            "authors", new String[]{"Author " + u},
            "categories", new String[]{"Category " + u},
            "circulationPolicy", CirculationPolicy.STANDARD.name()
        ))).get("id").asText();
    }

    private String copy(String b) throws Exception {
        return json(postJson(libSession, "/api/v1/books/" + b + "/copies", Map.of(
            "copyIdentifier", "CP-" + UUID.randomUUID()
        ))).get("id").asText();
    }

    private String submit(MockHttpSession s, String b) throws Exception {
        return json(postJson(s, "/api/v1/borrow-requests", Map.of("bookId", b))).get("id").asText();
    }

    private void approve(String r) throws Exception {
        assertEquals(200, postJson(libSession, "/api/v1/borrow-requests/" + r + "/decision", Map.of("decision", "APPROVE")).getResponse().getStatus());
    }

    private MvcResult postJson(MockHttpSession s, String path, Object value) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
            .session(s)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(value instanceof String x ? x : mapper.writeValueAsString(value)))
            .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }
}
