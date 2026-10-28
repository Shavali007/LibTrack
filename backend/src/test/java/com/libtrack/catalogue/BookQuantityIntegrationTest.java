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
import java.util.List;
import java.util.Locale;
import java.util.ArrayDeque;
import java.util.Queue;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.web.servlet.MockMvc;

@LibTrackIntegrationTest
class BookQuantityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired BookCopyRepository copies;
    @Autowired TestCopyIdentifierGenerator identifiers;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void useUniqueIdentifiersByDefault() {
        identifiers.useRandomIdentifiers();
    }

    @Test
    void createsOneBookAndExactlyOneAvailableCopyForQuantityOne() throws Exception {
        String title = uniqueTitle();
        var result = createBook(title, "1");
        String id = result.get("id").asText();

        mvc.perform(get("/api/v1/books/{id}/copies", id).with(user("librarian").roles("LIBRARIAN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
            .andExpect(jsonPath("$[0].status").value("AVAILABLE"))
            .andExpect(jsonPath("$[0].copyIdentifier").value(org.hamcrest.Matchers.matchesPattern("[A-F0-9-]{36}")));
        mvc.perform(get("/api/v1/books/{id}", id))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCopies").value(1)).andExpect(jsonPath("$.availableCopies").value(1));
    }

    @Test
    void createsExactlyTheRequestedNumberAndAvailabilityUsesCopyStates() throws Exception {
        String id = createBook(uniqueTitle(), "10").get("id").asText();
        var created = copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(id));
        org.junit.jupiter.api.Assertions.assertEquals(10, created.size());
        org.junit.jupiter.api.Assertions.assertEquals(10, created.stream().map(BookCopy::getCopyIdentifier).distinct().count());

        CopyStatus[] states = {CopyStatus.AVAILABLE, CopyStatus.ON_LOAN, CopyStatus.LOST, CopyStatus.DAMAGED, CopyStatus.WITHDRAWN};
        for (int index = 0; index < states.length; index++) {
            BookCopy copy = created.get(index);
            copy.update(copy.getCopyIdentifier(), copy.getLocation(), states[index]);
        }
        copies.saveAllAndFlush(created);
        mvc.perform(get("/api/v1/books/{id}", id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCopies").value(10)).andExpect(jsonPath("$.availableCopies").value(6))
            .andExpect(jsonPath("$.onLoanCopies").value(1)).andExpect(jsonPath("$.lostCopies").value(1))
            .andExpect(jsonPath("$.damagedCopies").value(1)).andExpect(jsonPath("$.withdrawnCopies").value(1));
    }

    @Test
    void rejectsOutOfRangeAndFractionalQuantities() throws Exception {
        for (String quantity : List.of("0", "-1", "501", "1.5")) {
            mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content(bookJson(uniqueTitle(), quantity)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.numberOfCopies").exists());
        }
    }

    @Test
    void bulkAdditionCreatesFiveCopiesWithoutChangingExistingCopiesAndReturnsUpdatedCounts() throws Exception {
        String id = createBook(uniqueTitle(), "2").get("id").asText();
        var result = mvc.perform(post("/api/v1/books/{id}/copies/bulk", id).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"numberOfCopies\":5,\"location\":\"Shelf B\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(5)))
            .andExpect(jsonPath("$[0].status").value("AVAILABLE")).andExpect(jsonPath("$[0].location").value("Shelf B"))
            .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(5, json.readTree(result.getResponse().getContentAsString()).size());
        mvc.perform(get("/api/v1/books/{id}/copies", id).with(user("librarian").roles("LIBRARIAN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(7)));
        mvc.perform(get("/api/v1/books/{id}", id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCopies").value(7)).andExpect(jsonPath("$.availableCopies").value(7));
    }

    @Test
    void rejectsInvalidAndUnauthorizedBulkInventoryRequests() throws Exception {
        String id = createBook(uniqueTitle(), null).get("id").asText();
        for (String quantity : List.of("0", "-1", "501", "1.5", "\"\"", "null")) {
            mvc.perform(post("/api/v1/books/{id}/copies/bulk", id).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"numberOfCopies\":" + quantity + "}"))
                .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/v1/books/{id}/copies/bulk", id).with(user("student").roles("STUDENT")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"numberOfCopies\":1}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/books/{id}/copies/bulk", id).with(user("librarian").roles("LIBRARIAN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"numberOfCopies\":1}"))
            .andExpect(status().isForbidden());
        org.junit.jupiter.api.Assertions.assertTrue(copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(id)).isEmpty());
    }

    @Test
    void booksWithoutPhysicalCopiesReturnZeroForEveryInventoryCount() throws Exception {
        String id = createBook(uniqueTitle(), null).get("id").asText();
        mvc.perform(get("/api/v1/books/{id}", id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCopies").value(0)).andExpect(jsonPath("$.availableCopies").value(0))
            .andExpect(jsonPath("$.onLoanCopies").value(0)).andExpect(jsonPath("$.lostCopies").value(0))
            .andExpect(jsonPath("$.damagedCopies").value(0)).andExpect(jsonPath("$.withdrawnCopies").value(0));
    }

    @Test
    void anOnLoanCopyCannotBeWithdrawnAndRetainsItsCount() throws Exception {
        String id = createBook(uniqueTitle(), "1").get("id").asText();
        BookCopy copy = copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(id)).getFirst();
        copy.update(copy.getCopyIdentifier(), copy.getLocation(), CopyStatus.ON_LOAN);
        copies.saveAndFlush(copy);

        mvc.perform(patch("/api/v1/books/{id}/copies/{copyId}", id, copy.getId()).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"WITHDRAWN\"}"))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/books/{id}", id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCopies").value(1)).andExpect(jsonPath("$.onLoanCopies").value(1))
            .andExpect(jsonPath("$.withdrawnCopies").value(0));
    }

    @Test
    void bulkIdentifierConflictRollsBackAllNewCopies() throws Exception {
        String id = createBook(uniqueTitle(), null).get("id").asText();
        String duplicateIdentifier = ("DUPLICATE-" + UUID.randomUUID()).toUpperCase(Locale.ROOT);
        mvc.perform(post("/api/v1/books/{id}/copies", id).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"copyIdentifier\":\"" + duplicateIdentifier + "\"}"))
            .andExpect(status().isCreated());
        identifiers.useIdentifiers(duplicateIdentifier, "SECOND-COPY");
        mvc.perform(post("/api/v1/books/{id}/copies/bulk", id).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"numberOfCopies\":2}"))
            .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(1, copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(id)).size());
    }

    @Test
    void duplicateGeneratedIdentifierRollsBackTheBookAndEveryCopy() throws Exception {
        String existingBookId = createBook(uniqueTitle(), null).get("id").asText();
        String duplicateIdentifier = ("DUPLICATE-" + UUID.randomUUID()).toUpperCase(Locale.ROOT);
        mvc.perform(post("/api/v1/books/{id}/copies", existingBookId).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"copyIdentifier\":\"" + duplicateIdentifier + "\"}"))
            .andExpect(status().isCreated());
        identifiers.useIdentifiers(duplicateIdentifier, "SECOND-COPY");

        String failedTitle = uniqueTitle();
        mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(bookJson(failedTitle, "2")))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/books").param("title", failedTitle))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        org.junit.jupiter.api.Assertions.assertEquals(1, copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(existingBookId)).size());
    }

    @Test
    void updatingABookDoesNotCreateCopiesEvenIfAClientSendsTheCreateOnlyField() throws Exception {
        String id = createBook(uniqueTitle(), "1").get("id").asText();
        String body = bookJson("Updated " + uniqueTitle(), "50");
        mvc.perform(patch("/api/v1/books/{id}", id).with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCopies").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(1, copies.findAllByBookIdOrderByCopyIdentifierAsc(UUID.fromString(id)).size());
    }

    private com.fasterxml.jackson.databind.JsonNode createBook(String title, String quantity) throws Exception {
        var response = mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(bookJson(title, quantity)))
            .andExpect(status().isCreated()).andReturn();
        return json.readTree(response.getResponse().getContentAsString());
    }

    private String bookJson(String title, String quantity) {
        String quantityField = quantity == null ? "" : ",\"numberOfCopies\":" + quantity;
        return "{\"title\":\"" + title + "\",\"authors\":[\"Author " + title + "\"],\"categories\":[\"Category " + title + "\"],\"circulationPolicy\":\"STANDARD\"" + quantityField + "}";
    }

    private String uniqueTitle() { return "Quantity test " + UUID.randomUUID(); }

    @TestConfiguration(proxyBeanMethods = false)
    static class IdentifierTestConfiguration {
        @Bean @Primary TestCopyIdentifierGenerator testCopyIdentifierGenerator() { return new TestCopyIdentifierGenerator(); }
    }

    static class TestCopyIdentifierGenerator extends CopyIdentifierGenerator {
        private final Queue<String> queued = new ArrayDeque<>();
        void useRandomIdentifiers() { queued.clear(); }
        void useIdentifiers(String... values) { queued.clear(); queued.addAll(List.of(values)); }
        @Override public String generate() {
            return queued.isEmpty() ? UUID.randomUUID().toString().toUpperCase(Locale.ROOT) : queued.remove();
        }
    }
}
