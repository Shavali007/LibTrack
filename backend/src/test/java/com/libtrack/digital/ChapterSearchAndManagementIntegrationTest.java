package com.libtrack.digital;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageFitWidthDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDDocumentOutline;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineItem;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@LibTrackIntegrationTest
class ChapterSearchAndManagementIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private DigitalEditionChapterRepository chapterRepository;
    @Autowired private DigitalEditionRepository digitalEditionRepository;
    private final ObjectMapper json = new ObjectMapper();

    private byte[] createSamplePdf() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDDocumentOutline outline = new PDDocumentOutline();
            doc.getDocumentCatalog().setDocumentOutline(outline);

            // Page 1: Chapter 1
            PDPage p1 = new PDPage();
            doc.addPage(p1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, p1)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                cs.newLineAtOffset(50, 700);
                cs.showText("Chapter 1: Foundations of Algorithms");
                cs.newLineAtOffset(0, -25);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.showText("Computational complexity analyzes asymptotic bounds such as Big-O notation.");
                cs.endText();
            }

            PDOutlineItem item1 = new PDOutlineItem();
            item1.setTitle("Chapter 1: Foundations of Algorithms");
            PDPageFitWidthDestination dest1 = new PDPageFitWidthDestination();
            dest1.setPage(p1);
            item1.setDestination(dest1);
            outline.addLast(item1);

            // Page 2: Chapter 2
            PDPage p2 = new PDPage();
            doc.addPage(p2);
            try (PDPageContentStream cs = new PDPageContentStream(doc, p2)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                cs.newLineAtOffset(50, 700);
                cs.showText("Chapter 2: Graph Theory");
                cs.newLineAtOffset(0, -25);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.showText("Dijkstra shortest path algorithm computes optimal distances in weighted graphs.");
                cs.endText();
            }

            PDOutlineItem item2 = new PDOutlineItem();
            item2.setTitle("Chapter 2: Graph Theory");
            PDPageFitWidthDestination dest2 = new PDPageFitWidthDestination();
            dest2.setPage(p2);
            item2.setDestination(dest2);
            outline.addLast(item2);

            doc.save(baos);
        }
        return baos.toByteArray();
    }

    private byte[] createUnnumberedPdf() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDDocumentOutline outline = new PDDocumentOutline();
            doc.getDocumentCatalog().setDocumentOutline(outline);

            // Page 1: Unnumbered heading "Objects and Classes"
            PDPage p1 = new PDPage();
            doc.addPage(p1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, p1)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                cs.newLineAtOffset(50, 700);
                cs.showText("Objects and Classes");
                cs.newLineAtOffset(0, -25);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.showText("Java is an Object-Oriented Language. Objects have states and behaviors.");
                cs.endText();
            }

            PDOutlineItem item1 = new PDOutlineItem();
            item1.setTitle("Objects and Classes");
            PDPageFitWidthDestination dest1 = new PDPageFitWidthDestination();
            dest1.setPage(p1);
            item1.setDestination(dest1);
            outline.addLast(item1);

            doc.save(baos);
        }
        return baos.toByteArray();
    }

    private String validIsbn13(String seed) {
        String digits = seed.replaceAll("[^0-9]", "");
        String prefix = "978" + (digits + "000000000").substring(0, 9);
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            sum += (prefix.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
        }
        return prefix + ((10 - sum % 10) % 10);
    }

    private String createBook(String title) throws Exception {
        String isbn = validIsbn13(UUID.randomUUID().toString());
        String payload = json.writeValueAsString(Map.of(
                "title", title,
                "isbn", isbn,
                "authors", List.of("Algorithmist"),
                "categories", List.of("Computer Science"),
                "publisher", "Academic Press",
                "publicationYear", 2026,
                "circulationPolicy", "STANDARD"
        ));

        MvcResult result = mvc.perform(post("/api/v1/books")
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andReturn();

        return json.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    void uploadPdfAutomaticallyExtractsChaptersAndEnablesSearch() throws Exception {
        String bookId = createBook("Algorithms Textbook");
        byte[] pdfBytes = createSamplePdf();
        MockMultipartFile file = new MockMultipartFile("file", "algorithms.pdf", "application/pdf", pdfBytes);

        // Upload digital edition as librarian
        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFilename").value("algorithms.pdf"));

        // Verify chapters were extracted
        MvcResult chaptersResult = mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters", bookId)
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title", containsString("Chapter 1: Foundations of Algorithms")))
                .andExpect(jsonPath("$[0].startPage", equalTo(1)))
                .andExpect(jsonPath("$[0].endPage", equalTo(1)))
                .andExpect(jsonPath("$[1].title", containsString("Chapter 2: Graph Theory")))
                .andExpect(jsonPath("$[1].startPage", equalTo(2)))
                .andExpect(jsonPath("$[1].endPage", equalTo(2)))
                .andReturn();

        // Perform search within the digital edition for "Dijkstra"
        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters/search", bookId)
                .param("query", "Dijkstra")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.results[0].chapterTitle", containsString("Chapter 2: Graph Theory")))
                .andExpect(jsonPath("$.results[0].matches[0].pageNumber", equalTo(2)))
                .andExpect(jsonPath("$.results[0].matches[0].snippet", containsString("shortest path algorithm")));

        // Perform search for "complexity"
        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters/search", bookId)
                .param("query", "complexity")
                .with(user("faculty@vitap.ac.in").roles("FACULTY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.results[0].chapterTitle", containsString("Chapter 1: Foundations of Algorithms")))
                .andExpect(jsonPath("$.results[0].matches[0].pageNumber", equalTo(1)));

        // Empty search returns empty results
        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters/search", bookId)
                .param("query", "")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalMatches", equalTo(0)));
    }

    @Test
    void manualChapterManagementAndReprocessing() throws Exception {
        String bookId = createBook("Operating Systems");
        byte[] pdfBytes = createSamplePdf();
        MockMultipartFile file = new MockMultipartFile("file", "os.pdf", "application/pdf", pdfBytes);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        // 1. Librarian creates a new manual chapter
        String newChapterPayload = json.writeValueAsString(Map.of(
                "chapterNumber", 3,
                "title", "Chapter 3: Deadlocks",
                "startPage", 2,
                "endPage", 2
        ));

        MvcResult createResult = mvc.perform(post("/api/v1/books/{id}/digital-edition/chapters", bookId)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(newChapterPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Chapter 3: Deadlocks"))
                .andExpect(jsonPath("$.manuallyEdited").value(true))
                .andReturn();

        String createdChapterId = json.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        // 2. Student cannot create chapters (403 Forbidden)
        mvc.perform(post("/api/v1/books/{id}/digital-edition/chapters", bookId)
                .with(user("student@vitapstudent.ac.in").roles("STUDENT"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(newChapterPayload))
                .andExpect(status().isForbidden());

        // 3. Librarian updates the manual chapter
        String updatePayload = json.writeValueAsString(Map.of(
                "chapterNumber", 3,
                "title", "Chapter 3: Deadlock Prevention and Avoidance",
                "startPage", 2,
                "endPage", 2
        ));

        mvc.perform(put("/api/v1/books/{id}/digital-edition/chapters/{chapterId}", bookId, createdChapterId)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Chapter 3: Deadlock Prevention and Avoidance"))
                .andExpect(jsonPath("$.manuallyEdited").value(true));

        // 4. Reprocess without overwriteManual keeps the manually edited chapter
        mvc.perform(post("/api/v1/books/{id}/digital-edition/chapters/reprocess", bookId)
                .param("overwriteManual", "false")
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters", bookId)
                .with(user("librarian@example.edu").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.[?(@.title == 'Chapter 3: Deadlock Prevention and Avoidance')]").exists());

        // 5. Librarian deletes the chapter
        mvc.perform(delete("/api/v1/books/{id}/digital-edition/chapters/{chapterId}", bookId, createdChapterId)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isNoContent());

        // Verify chapter was deleted
        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters", bookId)
                .with(user("librarian@example.edu").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.[?(@.id == '" + createdChapterId + "')]").doesNotExist());
    }

    @Test
    void unauthenticatedSearchIsDenied() throws Exception {
        mvc.perform(get("/api/v1/books/{id}/digital-edition/chapters/search", UUID.randomUUID())
                .param("query", "test"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unnumberedHeadingRetainsNullChapterNumberAndPrefixNormalizedSearchWorks() throws Exception {
        String bookId = createBook("Java Programming Guide");
        byte[] pdfBytes = createUnnumberedPdf();
        MockMultipartFile file = new MockMultipartFile("file", "java-guide.pdf", "application/pdf", pdfBytes);

        // Upload digital edition
        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        // Canonical route /api/v1/books/{id}/chapters works
        mvc.perform(get("/api/v1/books/{id}/chapters", bookId)
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", equalTo("Objects and Classes")))
                .andExpect(jsonPath("$[0].chapterNumber").doesNotExist());

        // Search with prefixed query "Chapter 3 – Objects and Classes"
        mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .param("query", "Chapter 3 – Objects and Classes")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.chapters", hasSize(1)))
                .andExpect(jsonPath("$.results[0].chapterTitle", equalTo("Objects and Classes")))
                .andExpect(jsonPath("$.results[0].matches[0].pageNumber", equalTo(1)));

        // Search directly for "Objects and Classes"
        mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .param("query", "Objects and Classes")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.results[0].chapterTitle", equalTo("Objects and Classes")));
    }

    @Test
    void existingDigitalEditionWithZeroChaptersIsAutomaticallyIndexedOnDemand() throws Exception {
        String bookId = createBook("Existing Digital Edition");
        byte[] pdfBytes = createSamplePdf();
        MockMultipartFile file = new MockMultipartFile("file", "sample.pdf", "application/pdf", pdfBytes);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        UUID bId = UUID.fromString(bookId);
        var edition = digitalEditionRepository.findByBookId(bId).orElseThrow();
        // Simulate pre-V25 unindexed state
        chapterRepository.deleteAll(chapterRepository.findByDigitalEdition_Id(edition.getId()));
        assertEquals(0, chapterRepository.countByDigitalEdition_Id(edition.getId()));

        // Call canonical search endpoint: should automatically index on demand
        mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .param("query", "Dijkstra")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.results[0].chapterTitle", containsString("Chapter 2: Graph Theory")));

        // Verify chapter count in repository is now 2
        assertEquals(2, chapterRepository.countByDigitalEdition_Id(edition.getId()));

        // Repeated calls do not duplicate records
        mvc.perform(get("/api/v1/books/{id}/chapters", bookId)
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
        assertEquals(2, chapterRepository.countByDigitalEdition_Id(edition.getId()));
    }

    @Test
    void realWorldJavaPdfRegressionTest() throws Exception {
        java.io.File pdfFile = new java.io.File("../storage/digital-books/5bdff855-9a06-4d9c-92e5-bc9e1369b207.pdf");
        if (!pdfFile.exists()) {
            pdfFile = new java.io.File("storage/digital-books/5bdff855-9a06-4d9c-92e5-bc9e1369b207.pdf");
        }
        if (!pdfFile.exists()) {
            return;
        }

        byte[] pdfBytes = java.nio.file.Files.readAllBytes(pdfFile.toPath());
        String bookId = createBook("Java For Beginners");
        MockMultipartFile file = new MockMultipartFile("file", "java for beginners (3) (2).pdf", "application/pdf", pdfBytes);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        UUID bId = UUID.fromString(bookId);
        var edition = digitalEditionRepository.findByBookId(bId).orElseThrow();

        // 1. Clear chapters to simulate existing unindexed digital edition
        chapterRepository.deleteAll(chapterRepository.findByDigitalEdition_Id(edition.getId()));
        assertEquals(0, chapterRepository.countByDigitalEdition_Id(edition.getId()));

        // 2. Discover and auto-index on demand via canonical route
        MvcResult chaptersResult = mvc.perform(get("/api/v1/books/{id}/chapters", bookId)
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(15)))
                .andReturn();

        // 3. Verify 15 bookmarks and "Objects and Classes" has null chapterNumber and starts on page 17
        JsonNode chaptersTree = json.readTree(chaptersResult.getResponse().getContentAsString());
        assertEquals("Java - Basic Syntax", chaptersTree.get(0).get("title").asText());
        assertEquals(10, chaptersTree.get(0).get("startPage").asInt());
        assertTrue(chaptersTree.get(0).get("chapterNumber").isNull());

        assertEquals("Objects and Classes", chaptersTree.get(1).get("title").asText());
        assertEquals(17, chaptersTree.get(1).get("startPage").asInt());
        assertTrue(chaptersTree.get(1).get("chapterNumber").isNull());

        // 4. Search "Objects and Classes" returns relevant results
        mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .param("query", "Objects and Classes")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chapterTitle", equalTo("Objects and Classes")))
                .andExpect(jsonPath("$.results[0].startPage", equalTo(17)));

        // 5. Search "Chapter 3 – Objects and Classes" normalizes and finds section on page 17
        mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .characterEncoding(java.nio.charset.StandardCharsets.UTF_8)
                .param("query", "Chapter 3 – Objects and Classes")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chapterTitle", equalTo("Objects and Classes")))
                .andExpect(jsonPath("$.results[0].startPage", equalTo(17)))
                .andExpect(jsonPath("$.query", equalTo("Chapter 3 – Objects and Classes")));

        // 5b. Heading-Based Search for "operators" returns structured section headings instead of 43 noisy paragraphs
        MvcResult opResult = mvc.perform(get("/api/v1/books/{id}/chapters/search", bookId)
                .param("query", "operators")
                .with(user("student@vitapstudent.ac.in").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].chapterTitle", equalTo("Operators in Java")))
                .andReturn();

        JsonNode opTree = json.readTree(opResult.getResponse().getContentAsString());
        JsonNode opMatches = opTree.get("results").get(0).get("matches");
        assertTrue(opMatches.size() >= 7, "Expected at least 7 operator headings, got " + opMatches.size());

        List<String> headingsFound = new ArrayList<>();
        for (JsonNode m : opMatches) {
            headingsFound.add(m.hasNonNull("headingTitle") ? m.get("headingTitle").asText() : m.get("snippet").asText());
        }
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Operators in Java")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Arithmetic Operators")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Relational Operators")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Bitwise Operators")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Logical Operators")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Assignment Operators")));
        assertTrue(headingsFound.stream().anyMatch(h -> h.contains("Misc Operators")));

        // 6. Repeated searches do not create duplicate chapter records
        assertEquals(15, chapterRepository.countByDigitalEdition_Id(edition.getId()));

        // 7. Manual chapter changes survive reprocessing
        var chapters = chapterRepository.findByDigitalEdition_IdOrderByStartPageAscChapterNumberAsc(edition.getId());
        var ch2 = chapters.get(1);
        ch2.update(null, "Objects and Classes (Customized Manual Title)", ch2.getStartPage(), ch2.getEndPage(), ch2.getContent(), true);
        chapterRepository.saveAndFlush(ch2);

        // Reprocess with overwriteManual = false
        mvc.perform(post("/api/v1/books/{id}/chapters/reprocess", bookId)
                .param("overwriteManual", "false")
                .with(user("librarian@example.edu").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isOk());

        var reprocessed = chapterRepository.findByDigitalEdition_IdOrderByStartPageAscChapterNumberAsc(edition.getId());
        assertEquals(15, reprocessed.size());
        assertTrue(reprocessed.stream().anyMatch(c -> "Objects and Classes (Customized Manual Title)".equals(c.getTitle()) && c.isManuallyEdited()));
    }
}
