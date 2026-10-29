package com.libtrack.digital;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.LibTrackIntegrationTest;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@LibTrackIntegrationTest
class DigitalEditionIntegrationTest {

    private static final byte[] VALID_PDF_BYTES = "%PDF-1.5\nSample Digital Book Content\n%%EOF".getBytes(StandardCharsets.UTF_8);
    private static final byte[] SECOND_PDF_BYTES = "%PDF-1.7\nSecond Edition Digital Content\n%%EOF".getBytes(StandardCharsets.UTF_8);

    @Autowired private MockMvc mvc;
    @Autowired private BookCopyRepository copyRepository;
    @Autowired private DigitalEditionRepository digitalEditionRepository;
    @Autowired private DigitalEditionStorageService storageService;
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void unauthenticatedUserCannotUploadDigitalEdition() throws Exception {
        String bookId = createBook("Unauth Test Book", "2").get("id").asText();
        MockMultipartFile file = new MockMultipartFile("file", "book.pdf", "application/pdf", VALID_PDF_BYTES);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentAndFacultyCannotUploadReplaceOrDeleteDigitalEdition() throws Exception {
        String bookId = createBook("Role Forbidden Test Book", "3").get("id").asText();
        MockMultipartFile file = new MockMultipartFile("file", "book.pdf", "application/pdf", VALID_PDF_BYTES);

        for (String role : List.of("STUDENT", "FACULTY")) {
            mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                    .file(file)
                    .with(user("testUser").roles(role))
                    .with(csrf()))
                    .andExpect(status().isForbidden());

            mvc.perform(multipart(HttpMethod.PUT, "/api/v1/books/{id}/digital-edition", bookId)
                    .file(file)
                    .with(user("testUser").roles(role))
                    .with(csrf()))
                    .andExpect(status().isForbidden());

            mvc.perform(delete("/api/v1/books/{id}/digital-edition", bookId)
                    .with(user("testUser").roles(role))
                    .with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void librarianCanUploadViewReadAndDownloadDigitalEdition() throws Exception {
        String bookId = createBook("Complete Flow Book", "4").get("id").asText();
        MockMultipartFile file = new MockMultipartFile("file", "Algorithms_3rd_Ed.pdf", "application/pdf", VALID_PDF_BYTES);

        // Upload
        var uploadResult = mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .param("editionLabel", "3rd Special Edition")
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookId").value(bookId))
                .andExpect(jsonPath("$.originalFilename").value("Algorithms_3rd_Ed.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.fileSize").value(VALID_PDF_BYTES.length))
                .andExpect(jsonPath("$.editionLabel").value("3rd Special Edition"))
                .andReturn();

        JsonNode uploadJson = json.readTree(uploadResult.getResponse().getContentAsString());
        assertNotNull(uploadJson.get("id").asText());

        // Anonymous/Public metadata inspection
        mvc.perform(get("/api/v1/books/{id}/digital-edition", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("Algorithms_3rd_Ed.pdf"))
                .andExpect(jsonPath("$.editionLabel").value("3rd Special Edition"));

        // Book details hasDigitalEdition flag
        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasDigitalEdition").value(true))
                .andExpect(jsonPath("$.totalCopies").value(4))
                .andExpect(jsonPath("$.availableCopies").value(4));

        // Catalogue search summary hasDigitalEdition flag
        mvc.perform(get("/api/v1/books").param("q", "Complete Flow Book"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].hasDigitalEdition").value(true));

        // Student can read inline
        mvc.perform(get("/api/v1/books/{id}/digital-edition/content", bookId)
                .with(user("student1").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("inline; filename=\"Algorithms_3rd_Ed.pdf\"")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'self' http://localhost:4200 http://localhost:8080")))
                .andExpect(content().bytes(VALID_PDF_BYTES));

        // Faculty can download attachment
        mvc.perform(get("/api/v1/books/{id}/digital-edition/download", bookId)
                .with(user("faculty1").roles("FACULTY")))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment; filename=\"Algorithms_3rd_Ed.pdf\"")))
                .andExpect(content().bytes(VALID_PDF_BYTES));
    }

    @Test
    void librarianCanReplaceDigitalEditionAndOldFileIsCleanedUp() throws Exception {
        String bookId = createBook("Replace Test Book", "1").get("id").asText();
        MockMultipartFile initialFile = new MockMultipartFile("file", "initial.pdf", "application/pdf", VALID_PDF_BYTES);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(initialFile)
                .param("editionLabel", "v1")
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        DigitalEdition firstEdition = digitalEditionRepository.findByBookId(UUID.fromString(bookId)).orElseThrow();
        String firstStorageKey = firstEdition.getStorageKey();
        assertTrue(storageService.exists(firstStorageKey));

        // Replace with v2
        MockMultipartFile secondFile = new MockMultipartFile("file", "updated_edition.pdf", "application/pdf", SECOND_PDF_BYTES);
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/books/{id}/digital-edition", bookId)
                .file(secondFile)
                .param("editionLabel", "v2-revised")
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("updated_edition.pdf"))
                .andExpect(jsonPath("$.editionLabel").value("v2-revised"))
                .andExpect(jsonPath("$.fileSize").value(SECOND_PDF_BYTES.length));

        DigitalEdition secondEdition = digitalEditionRepository.findByBookId(UUID.fromString(bookId)).orElseThrow();
        assertEquals("updated_edition.pdf", secondEdition.getOriginalFilename());
        assertEquals("v2-revised", secondEdition.getEditionLabel());

        // Verify first storage file is cleaned up, second exists
        assertFalse(storageService.exists(firstStorageKey));
        assertTrue(storageService.exists(secondEdition.getStorageKey()));

        // Content returns second edition
        mvc.perform(get("/api/v1/books/{id}/digital-edition/content", bookId)
                .with(user("student1").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(content().bytes(SECOND_PDF_BYTES));
    }

    @Test
    void librarianCanDeleteDigitalEditionAndPhysicalCopiesRemainIntact() throws Exception {
        String bookId = createBook("Delete Edition Book", "5").get("id").asText();
        MockMultipartFile file = new MockMultipartFile("file", "to_delete.pdf", "application/pdf", VALID_PDF_BYTES);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        DigitalEdition edition = digitalEditionRepository.findByBookId(UUID.fromString(bookId)).orElseThrow();
        String storageKey = edition.getStorageKey();
        assertTrue(storageService.exists(storageKey));

        // Delete digital edition
        mvc.perform(delete("/api/v1/books/{id}/digital-edition", bookId)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isNoContent());

        // Verify metadata deleted & file removed
        assertFalse(digitalEditionRepository.existsByBookId(UUID.fromString(bookId)));
        assertFalse(storageService.exists(storageKey));

        // Metadata endpoint now returns 404
        mvc.perform(get("/api/v1/books/{id}/digital-edition", bookId))
                .andExpect(status().isNotFound());

        // Book details reflect no digital edition, but physical copies are completely unchanged
        mvc.perform(get("/api/v1/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasDigitalEdition").value(false))
                .andExpect(jsonPath("$.totalCopies").value(5))
                .andExpect(jsonPath("$.availableCopies").value(5));

        List<BookCopy> copies = copyRepository.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(bookId));
        assertEquals(5, copies.size());
    }

    @Test
    void rejectsEmptyFileOrNonPdfFileOrInvalidMagicBytes() throws Exception {
        String bookId = createBook("Validation Test Book", "1").get("id").asText();

        // Empty file
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);
        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(emptyFile)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("non-empty")));

        // Non-PDF extension
        MockMultipartFile textFile = new MockMultipartFile("file", "test.txt", "text/plain", "Not a pdf".getBytes());
        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(textFile)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString(".pdf")));

        // PDF extension but corrupted/invalid magic bytes (not starting with %PDF-)
        MockMultipartFile fakePdf = new MockMultipartFile("file", "fake.pdf", "application/pdf", "NOT_MAGIC_BYTES_FAKE_PDF".getBytes());
        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(fakePdf)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("PDF signature")));
    }

    @Test
    void readingInactiveBookFailsForStudentButLibrarianCanAccess() throws Exception {
        String bookId = createBook("Inactive Book", "1").get("id").asText();
        MockMultipartFile file = new MockMultipartFile("file", "inactive.pdf", "application/pdf", VALID_PDF_BYTES);

        mvc.perform(multipart("/api/v1/books/{id}/digital-edition", bookId)
                .file(file)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isCreated());

        // Deactivate the book
        mvc.perform(post("/api/v1/books/{id}/deactivate", bookId)
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf()))
                .andExpect(status().isNoContent());

        // Student cannot read inactive book content
        mvc.perform(get("/api/v1/books/{id}/digital-edition/content", bookId)
                .with(user("student1").roles("STUDENT")))
                .andExpect(status().isNotFound());

        // Librarian can still inspect content
        mvc.perform(get("/api/v1/books/{id}/digital-edition/content", bookId)
                .with(user("librarian").roles("LIBRARIAN")))
                .andExpect(status().isOk());
    }

    private JsonNode createBook(String title, String quantity) throws Exception {
        String quantityField = quantity == null ? "" : ",\"numberOfCopies\":" + quantity;
        String content = "{\"title\":\"" + title + "\",\"authors\":[\"Author " + title + "\"],\"categories\":[\"Category " + title + "\"],\"circulationPolicy\":\"STANDARD\"" + quantityField + "}";
        var response = mvc.perform(post("/api/v1/books")
                .with(user("librarian").roles("LIBRARIAN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(response.getResponse().getContentAsString());
    }
}
