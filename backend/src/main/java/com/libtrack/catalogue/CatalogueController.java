package com.libtrack.catalogue;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Validated
public class CatalogueController {
    private final CatalogueService catalogue;
    public CatalogueController(CatalogueService catalogue) { this.catalogue = catalogue; }

    @GetMapping("/books")
    public PageResponse<BookSummaryResponse> search(
            @RequestParam(required = false) String q, @RequestParam(required = false) String title,
            @RequestParam(required = false) String author, @RequestParam(required = false) String isbn,
            @RequestParam(required = false) String category, @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "title") String sort, @RequestParam(defaultValue = "asc") String direction) {
        return catalogue.search(q, title, author, isbn, category, available, page, size, sort, direction);
    }

    @GetMapping("/books/{bookId}")
    public BookDetailResponse getBook(@PathVariable UUID bookId, Authentication authentication) {
        boolean librarian = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LIBRARIAN"));
        return catalogue.getBook(bookId, librarian);
    }

    @GetMapping("/categories")
    public List<CategoryResponse> categories() { return catalogue.listCategories(); }

    @PostMapping("/books")
    public ResponseEntity<BookDetailResponse> create(@Valid @RequestBody BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogue.createBook(request));
    }

    @PatchMapping("/books/{bookId}")
    public BookDetailResponse update(@PathVariable UUID bookId, @Valid @RequestBody BookRequest request) {
        return catalogue.updateBook(bookId, request);
    }

    @PostMapping("/books/{bookId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID bookId) {
        catalogue.deactivateBook(bookId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/books/{bookId}/copies")
    public List<BookCopyResponse> copies(@PathVariable UUID bookId) { return catalogue.listCopies(bookId); }

    @PostMapping("/books/{bookId}/copies")
    public ResponseEntity<BookCopyResponse> addCopy(@PathVariable UUID bookId, @Valid @RequestBody BookCopyCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogue.addCopy(bookId, request));
    }

    @PatchMapping("/books/{bookId}/copies/{copyId}")
    public BookCopyResponse updateCopy(@PathVariable UUID bookId, @PathVariable UUID copyId, @Valid @RequestBody BookCopyUpdateRequest request) {
        return catalogue.updateCopy(bookId, copyId, request);
    }
}
