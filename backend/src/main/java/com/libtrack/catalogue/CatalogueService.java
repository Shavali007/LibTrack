package com.libtrack.catalogue;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogueService {
    private static final int MAX_PAGE_SIZE = 100;
    private final BookRepository books;
    private final AuthorRepository authors;
    private final CategoryRepository categories;
    private final BookCopyRepository copies;

    public CatalogueService(BookRepository books, AuthorRepository authors, CategoryRepository categories, BookCopyRepository copies) {
        this.books = books; this.authors = authors; this.categories = categories; this.copies = copies;
    }

    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    @Transactional(readOnly = true)
    public PageResponse<BookSummaryResponse> search(String q, String title, String author, String isbn, String category, Boolean available,
                                                     int page, int size, String sortField, String direction) {
        if (page < 0) throw new IllegalArgumentException("Page must be zero or greater.");
        if (size < 1 || size > MAX_PAGE_SIZE) throw new IllegalArgumentException("Page size must be between 1 and 100.");
        String field = switch (sortField == null ? "title" : sortField) {
            case "title" -> "title";
            case "publicationYear" -> "publicationYear";
            case "createdAt" -> "createdAt";
            default -> throw new IllegalArgumentException("Unsupported sort field.");
        };
        Sort.Direction sortDirection;
        try { sortDirection = Sort.Direction.fromString(direction == null ? "asc" : direction); }
        catch (IllegalArgumentException exception) { throw new IllegalArgumentException("Sort direction must be asc or desc."); }
        Sort sort = Sort.by(sortDirection, field).and(Sort.by(Sort.Direction.ASC, "id"));
        Specification<Book> filters = BookSpecifications.search(q, title, author, isbn, category, available);
        Page<Book> result = books.findAll(filters, PageRequest.of(page, size, sort));
        Map<UUID, BookAvailability> availability = availability(result.getContent());
        List<BookSummaryResponse> content = result.getContent().stream().map(book -> summary(book, availability.get(book.getId()))).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    @Transactional(readOnly = true)
    public BookDetailResponse getBook(UUID id, boolean librarian) {
        Book book = books.findById(id).filter(found -> found.isActive() || librarian).orElseThrow(BookNotFoundException::new);
        return detail(book, availability(List.of(book)).get(book.getId()));
    }

    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categories.findAllByOrderByNameAsc().stream().map(category -> new CategoryResponse(category.getId(), category.getName())).toList();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<BookCopyResponse> listCopies(UUID bookId) {
        if (!books.existsById(bookId)) throw new BookNotFoundException();
        return copies.findAllByBookIdOrderByCopyIdentifierAsc(bookId).stream().map(CatalogueService::copyResponse).toList();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookDetailResponse createBook(BookRequest request) {
        SetNames names = resolveNames(request.authors(), request.categories());
        Book book = new Book(request.title().strip(), IsbnValidator.normalize(request.isbn()), clean(request.description()),
                clean(request.publisher()), request.publicationYear(), clean(request.coverImageUrl()), request.circulationPolicy(), names.authors(), names.categories());
        try {
            book = books.saveAndFlush(book);
            return detail(book, availability(List.of(book)).get(book.getId()));
        } catch (DataIntegrityViolationException exception) { throw new CatalogueConflictException(); }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookDetailResponse updateBook(UUID id, BookRequest request) {
        Book book = books.findById(id).orElseThrow(BookNotFoundException::new);
        SetNames names = resolveNames(request.authors(), request.categories());
        book.update(request.title().strip(), IsbnValidator.normalize(request.isbn()), clean(request.description()),
                clean(request.publisher()), request.publicationYear(), clean(request.coverImageUrl()), request.circulationPolicy(), names.authors(), names.categories());
        try {
            books.flush();
            return detail(book, availability(List.of(book)).get(book.getId()));
        } catch (DataIntegrityViolationException exception) { throw new CatalogueConflictException(); }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public void deactivateBook(UUID id) {
        Book book = books.findById(id).orElseThrow(BookNotFoundException::new);
        book.deactivate();
        books.flush();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookCopyResponse addCopy(UUID bookId, BookCopyCreateRequest request) {
        Book book = books.findById(bookId).filter(Book::isActive).orElseThrow(BookNotFoundException::new);
        BookCopy copy = new BookCopy(book, normalizeIdentifier(request.copyIdentifier()), clean(request.location()));
        try { return copyResponse(copies.saveAndFlush(copy)); }
        catch (DataIntegrityViolationException exception) { throw new CatalogueConflictException(); }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookCopyResponse updateCopy(UUID bookId, UUID copyId, BookCopyUpdateRequest request) {
        BookCopy copy = copies.findByIdAndBookId(copyId, bookId).orElseThrow(BookCopyNotFoundException::new);
        if (copy.getStatus() == CopyStatus.ON_LOAN) throw new InvalidCopyStateException();
        copy.update(request.copyIdentifier() == null ? copy.getCopyIdentifier() : normalizeIdentifier(request.copyIdentifier()),
                request.location() == null ? copy.getLocation() : clean(request.location()), CopyStatus.valueOf(request.status().name()));
        try { copies.flush(); return copyResponse(copy); }
        catch (DataIntegrityViolationException exception) { throw new CatalogueConflictException(); }
    }

    private SetNames resolveNames(List<String> authorNames, List<String> categoryNames) {
        LinkedHashSet<Author> resolvedAuthors = new LinkedHashSet<>();
        for (String name : authorNames) {
            String normalized = normalizeName(name);
            resolvedAuthors.add(authors.findByNormalizedName(normalized).orElseGet(() -> authors.save(new Author(name.strip(), normalized))));
        }
        LinkedHashSet<Category> resolvedCategories = new LinkedHashSet<>();
        for (String name : categoryNames) {
            String normalized = normalizeName(name);
            resolvedCategories.add(categories.findByNormalizedName(normalized).orElseGet(() -> categories.save(new Category(name.strip(), normalized))));
        }
        return new SetNames(resolvedAuthors, resolvedCategories);
    }

    private Map<UUID, BookAvailability> availability(Collection<Book> bookList) {
        if (bookList.isEmpty()) return Map.of();
        List<UUID> ids = bookList.stream().map(Book::getId).toList();
        return copies.summarize(ids, CopyStatus.AVAILABLE, CopyStatus.WITHDRAWN).stream()
                .collect(Collectors.toMap(BookAvailability::bookId, Function.identity()));
    }

    private static BookSummaryResponse summary(Book book, BookAvailability counts) {
        long total = counts == null ? 0 : counts.totalCopies();
        long available = counts == null ? 0 : counts.availableCopies();
        return new BookSummaryResponse(book.getId(), book.getTitle(), book.getIsbn(), sortedAuthors(book), sortedCategories(book),
                book.getPublisher(), book.getPublicationYear(), book.getCoverImageUrl(), book.getCirculationPolicy(), total, available);
    }

    private static BookDetailResponse detail(Book book, BookAvailability counts) {
        long total = counts == null ? 0 : counts.totalCopies();
        long available = counts == null ? 0 : counts.availableCopies();
        return new BookDetailResponse(book.getId(), book.getTitle(), book.getIsbn(), book.getDescription(), sortedAuthors(book), sortedCategories(book),
                book.getPublisher(), book.getPublicationYear(), book.getCoverImageUrl(), book.getCirculationPolicy(), book.isActive(), total, available, book.getCreatedAt(), book.getUpdatedAt());
    }

    private static List<String> sortedAuthors(Book book) { return book.getAuthors().stream().map(Author::getName).sorted(String.CASE_INSENSITIVE_ORDER).toList(); }
    private static List<String> sortedCategories(Book book) { return book.getCategories().stream().map(Category::getName).sorted(String.CASE_INSENSITIVE_ORDER).toList(); }
    private static BookCopyResponse copyResponse(BookCopy copy) {
        return new BookCopyResponse(copy.getId(), copy.getBook().getId(), copy.getCopyIdentifier(), copy.getLocation(), copy.getStatus(), copy.getCreatedAt(), copy.getUpdatedAt());
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.strip(); }
    private static String normalizeName(String value) { return value.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
    private static String normalizeIdentifier(String value) { return value.strip().toUpperCase(Locale.ROOT); }
    private record SetNames(LinkedHashSet<Author> authors, LinkedHashSet<Category> categories) {}
}
