package com.libtrack.circulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import java.time.Clock;
import java.time.Instant;
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
    "spring.datasource.url=jdbc:h2:mem:libtrack-receipt-test;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "libtrack.library-zone=Asia/Kolkata"
})
@Transactional
class BookIssueReceiptIntegrationTest {

    private static final String PASSWORD = "Sufficiently Long Test Password 1!";

    @Autowired MockMvc mvc;
    @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired BookRepository books;
    @Autowired BookCopyRepository copies;
    @Autowired LoanRepository loans;
    @Autowired LoanReceiptRepository receipts;
    @Autowired LoanReceiptService receiptService;
    @Autowired Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    private UserAccount librarian;
    private MockHttpSession libSession;

    @BeforeEach
    void setup() throws Exception {
        String t = UUID.randomUUID().toString();
        librarian = accounts.saveAndFlush(UserAccount.initialLibrarian("lib-receipt-" + t + "@example.edu", encoder.encode(PASSWORD)));
        libSession = login(librarian);
    }

    @Test
    void receiptGeneratedAutomaticallyOnPhysicalBookIssue() throws Exception {
        UserAccount student = member(AccountRole.STUDENT, "Alice Reader", "STU-2026-001");
        MockHttpSession studentSession = login(student);

        String bookId = book("Data Structures & Algorithms in Java");
        String copyId = copy(bookId, "DS-001");

        // 1. Submit and approve borrow request
        String reqId = submit(studentSession, bookId);
        approve(reqId);

        // 2. Issue book copy
        MvcResult issueResult = postJson(libSession, "/api/v1/borrow-requests/" + reqId + "/issue", Map.of("copyId", copyId));
        assertEquals(201, issueResult.getResponse().getStatus());
        JsonNode loanJson = json(issueResult);
        UUID loanId = UUID.fromString(loanJson.get("id").asText());

        // 3. Verify LoanReceipt record was automatically created
        LoanReceipt receipt = receipts.findByLoan_Id(loanId).orElse(null);
        assertNotNull(receipt, "LoanReceipt should be generated immediately upon book issue");
        assertNotNull(receipt.getReceiptNumber());
        assertTrue(receipt.getReceiptNumber().startsWith("REC-"), "Receipt number should start with REC-");
        assertEquals(librarian.getId(), receipt.getIssuedBy().getId());

        // 4. Verify Receipt Metadata API
        MvcResult metaResult = mvc.perform(get("/api/v1/loans/" + loanId + "/receipt").session(studentSession)).andReturn();
        assertEquals(200, metaResult.getResponse().getStatus());
        JsonNode metaJson = json(metaResult);
        assertEquals(receipt.getReceiptNumber(), metaJson.get("receiptNumber").asText());
        assertEquals("Alice Reader", metaJson.get("borrowerName").asText());
        assertEquals("STU-2026-001", metaJson.get("borrowerInstitutionalId").asText());
        assertEquals("Data Structures & Algorithms in Java", metaJson.get("bookTitle").asText());
        assertEquals("DS-001", metaJson.get("copyIdentifier").asText());
        assertNotNull(metaJson.get("formattedGeneratedAt").asText());
    }

    @Test
    void pdfReceiptDownloadWorksForLibrarianAndBorrower() throws Exception {
        UserAccount faculty = member(AccountRole.FACULTY, "Dr. Robert Smith", "FAC-2026-042");
        MockHttpSession facultySession = login(faculty);

        String bookId = book("Quantum Computing Principles");
        String copyId = copy(bookId, "QC-101");

        String reqId = submit(facultySession, bookId);
        approve(reqId);

        MvcResult issueResult = postJson(libSession, "/api/v1/borrow-requests/" + reqId + "/issue", Map.of("copyId", copyId));
        assertEquals(201, issueResult.getResponse().getStatus());
        String loanId = json(issueResult).get("id").asText();

        // 1. Borrower downloads receipt PDF
        MvcResult facultyPdf = mvc.perform(get("/api/v1/loans/" + loanId + "/receipt/pdf").session(facultySession)).andReturn();
        assertEquals(200, facultyPdf.getResponse().getStatus());
        assertEquals(MediaType.APPLICATION_PDF_VALUE, facultyPdf.getResponse().getContentType());
        byte[] facultyBytes = facultyPdf.getResponse().getContentAsByteArray();
        assertTrue(facultyBytes.length > 500, "PDF should not be empty");
        String pdfHeader = new String(facultyBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader, "Valid PDF must start with %PDF-");

        // 2. Librarian downloads receipt PDF
        MvcResult libPdf = mvc.perform(get("/api/v1/loans/" + loanId + "/receipt/pdf").session(libSession)).andReturn();
        assertEquals(200, libPdf.getResponse().getStatus());
        assertEquals(MediaType.APPLICATION_PDF_VALUE, libPdf.getResponse().getContentType());
        byte[] libBytes = libPdf.getResponse().getContentAsByteArray();
        assertTrue(libBytes.length > 500);
        assertEquals("%PDF-", new String(libBytes, 0, 5));
    }

    @Test
    void otherStudentForbiddenFromAccessingReceipt() throws Exception {
        UserAccount studentA = member(AccountRole.STUDENT, "Student A", "STU-A");
        UserAccount studentB = member(AccountRole.STUDENT, "Student B", "STU-B");
        MockHttpSession sessionA = login(studentA);
        MockHttpSession sessionB = login(studentB);

        String bookId = book("Discrete Mathematics");
        String copyId = copy(bookId, "DM-01");

        String reqId = submit(sessionA, bookId);
        approve(reqId);

        MvcResult issueResult = postJson(libSession, "/api/v1/borrow-requests/" + reqId + "/issue", Map.of("copyId", copyId));
        String loanId = json(issueResult).get("id").asText();

        // Student A (borrower) CAN access
        assertEquals(200, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt").session(sessionA)).andReturn().getResponse().getStatus());
        assertEquals(200, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt/pdf").session(sessionA)).andReturn().getResponse().getStatus());

        // Student B CANNOT access - Forbidden
        assertEquals(403, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt").session(sessionB)).andReturn().getResponse().getStatus());
        assertEquals(403, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt/pdf").session(sessionB)).andReturn().getResponse().getStatus());

        // Unauthenticated access returns 401
        assertEquals(401, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt")).andReturn().getResponse().getStatus());
        assertEquals(401, mvc.perform(get("/api/v1/loans/" + loanId + "/receipt/pdf")).andReturn().getResponse().getStatus());
    }

    @Test
    void exactlyOneReceiptPerLoanAndIdempotentRetrieval() throws Exception {
        UserAccount student = member(AccountRole.STUDENT, "Single Receipt Test", "STU-SINGLE");
        MockHttpSession studentSession = login(student);

        String bookId = book("Database Management Systems");
        String copyId = copy(bookId, "DBMS-01");

        String reqId = submit(studentSession, bookId);
        approve(reqId);

        MvcResult issueResult = postJson(libSession, "/api/v1/borrow-requests/" + reqId + "/issue", Map.of("copyId", copyId));
        UUID loanId = UUID.fromString(json(issueResult).get("id").asText());

        Loan loan = loans.findById(loanId).orElseThrow();
        LoanReceipt first = receiptService.getOrCreateReceipt(loan, librarian);
        LoanReceipt second = receiptService.getOrCreateReceipt(loan, librarian);

        assertEquals(first.getId(), second.getId(), "Must return identical receipt record");
        assertEquals(first.getReceiptNumber(), second.getReceiptNumber());
        assertEquals(1, receipts.findAll().stream().filter(r -> r.getLoan().getId().equals(loanId)).count());
    }

    private UserAccount member(AccountRole role, String displayName, String institutionalId) {
        String id = UUID.randomUUID().toString();
        UserAccount a = accounts.saveAndFlush(UserAccount.provisionMember(
            role.name().toLowerCase() + "-" + id + "@example.edu",
            encoder.encode(PASSWORD),
            role,
            institutionalId != null ? institutionalId : role.name() + "-" + id,
            librarian.getId(),
            Instant.now()
        ));
        if (displayName != null) {
            a.setDisplayName(displayName);
            a = accounts.saveAndFlush(a);
        }
        return a;
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

    private String book(String title) throws Exception {
        String u = UUID.randomUUID().toString();
        return json(postJson(libSession, "/api/v1/books", Map.of(
            "title", title,
            "authors", new String[]{"Author " + u.substring(0, 5)},
            "categories", new String[]{"Engineering"},
            "circulationPolicy", CirculationPolicy.STANDARD.name()
        ))).get("id").asText();
    }

    private String copy(String bookId, String copyId) throws Exception {
        return json(postJson(libSession, "/api/v1/books/" + bookId + "/copies", Map.of(
            "copyIdentifier", copyId != null ? copyId : "CP-" + UUID.randomUUID().toString().substring(0, 8)
        ))).get("id").asText();
    }

    private String submit(MockHttpSession s, String b) throws Exception {
        return json(postJson(s, "/api/v1/borrow-requests", Map.of("bookId", b))).get("id").asText();
    }

    private void approve(String r) throws Exception {
        assertEquals(200, postJson(libSession, "/api/v1/borrow-requests/" + r + "/decision", Map.of("decision", "APPROVE")).getResponse().getStatus());
    }

    private MvcResult postJson(MockHttpSession s, String path, Object value) throws Exception {
        return mvc.perform(post(path)
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
