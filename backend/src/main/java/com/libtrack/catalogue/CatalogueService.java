package com.libtrack.catalogue;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.notifications.NotificationService;

import java.util.ArrayList;
import java.util.Collection;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.libtrack.digital.DigitalEditionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.reservation.ReservationService;
import com.libtrack.reservation.BookReservationRepository;
import com.libtrack.reservation.ReservationStatus;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.LoanRepository;

@Service
public class CatalogueService {
    private static final int MAX_PAGE_SIZE = 100;
    private final BookRepository books;
    private final AuthorRepository authors;
    private final CategoryRepository categories;
    private final BookCopyRepository copies;
    private final CopyIdentifierGenerator copyIdentifierGenerator;
    private final DigitalEditionRepository digitalEditions;
    private final ReservationService reservations;
    private final LoanRepository loans;
    private final BorrowRequestRepository borrowRequests;
    private final BookReservationRepository bookReservations;
    private final UserAccountRepository userAccounts;
    private final NotificationService notificationService;
    private final com.libtrack.wishlist.WishlistService wishlistService;
    private final Clock clock;

    public CatalogueService(BookRepository books, AuthorRepository authors, CategoryRepository categories, BookCopyRepository copies,
                           CopyIdentifierGenerator copyIdentifierGenerator, DigitalEditionRepository digitalEditions,
                           ReservationService reservations, LoanRepository loans, BorrowRequestRepository borrowRequests,
                           BookReservationRepository bookReservations, UserAccountRepository userAccounts,
                           NotificationService notificationService,
                           com.libtrack.wishlist.WishlistService wishlistService,
                           Clock clock) {
        this.books = books; this.authors = authors; this.categories = categories; this.copies = copies;
        this.copyIdentifierGenerator = copyIdentifierGenerator;
        this.digitalEditions = digitalEditions;
        this.reservations = reservations;
        this.loans = loans;
        this.borrowRequests = borrowRequests;
        this.bookReservations = bookReservations;
        this.userAccounts = userAccounts;
        this.notificationService = notificationService;
        this.wishlistService = wishlistService;
        this.clock = clock;
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PageResponse<BookSummaryResponse> search(String q, String title, String author, String isbn, String category, Boolean available,
                                                     int page, int size, String sortField, String direction) {
        return search(q, title, author, isbn, category, null, available, null, null, null, page, size, sortField, direction);
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PageResponse<BookSummaryResponse> search(String q, String title, String author, String isbn, String category, Boolean available,
                                                     Integer publicationYearFrom, Integer publicationYearTo,
                                                     java.util.Collection<UUID> bookIds, int page, int size, String sortField, String direction) {
        return search(q, title, author, isbn, category, null, available, publicationYearFrom, publicationYearTo, bookIds, page, size, sortField, direction);
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PageResponse<BookSummaryResponse> search(String q, String title, String author, String isbn, String category, String department, Boolean available,
                                                     Integer publicationYearFrom, Integer publicationYearTo,
                                                     java.util.Collection<UUID> bookIds, int page, int size, String sortField, String direction) {
        if (page < 0) throw new IllegalArgumentException("Page must be zero or greater.");
        if (size < 1 || size > MAX_PAGE_SIZE) throw new IllegalArgumentException("Page size must be between 1 and 100.");
        if (publicationYearFrom != null && publicationYearTo != null && publicationYearFrom > publicationYearTo) {
            throw new IllegalArgumentException("Publication year range start must not exceed its end.");
        }
        boolean isRatingSort = "rating".equalsIgnoreCase(sortField) || "topRated".equalsIgnoreCase(sortField) || "top-rated".equalsIgnoreCase(sortField);
        Sort sort;
        if (isRatingSort) {
            if (direction != null && !direction.equalsIgnoreCase("asc") && !direction.equalsIgnoreCase("desc")) {
                throw new IllegalArgumentException("Sort direction must be asc or desc.");
            }
            sort = Sort.unsorted();
        } else {
            String field = switch (sortField == null ? "title" : sortField) {
                case "title" -> "title";
                case "publicationYear" -> "publicationYear";
                case "createdAt" -> "createdAt";
                default -> throw new IllegalArgumentException("Unsupported sort field.");
            };
            Sort.Direction sortDirection;
            try { sortDirection = Sort.Direction.fromString(direction == null ? "asc" : direction); }
            catch (IllegalArgumentException exception) { throw new IllegalArgumentException("Sort direction must be asc or desc."); }
            sort = Sort.by(sortDirection, field).and(Sort.by(Sort.Direction.ASC, "id"));
        }
        Specification<Book> filters = BookSpecifications.search(q, title, author, isbn, category, department, available, publicationYearFrom, publicationYearTo, bookIds, sortField, direction);
        Page<Book> result = books.findAll(filters, PageRequest.of(page, size, sort));
        Map<UUID, BookAvailability> availability = availability(result.getContent());
        List<UUID> resultBookIds = result.getContent().stream().map(Book::getId).toList();
        Set<UUID> digitalIds = resultBookIds.isEmpty() ? Set.of() : new HashSet<>(digitalEditions.findBookIdsWithDigitalEdition(resultBookIds));
        List<BookSummaryResponse> content = result.getContent().stream()
                .map(book -> summary(book, availability.get(book.getId()), digitalIds.contains(book.getId())))
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public BookDetailResponse getBook(UUID id, boolean librarian) {
        Book book = books.findById(id).filter(found -> found.isActive() || librarian).orElseThrow(BookNotFoundException::new);
        boolean hasDigitalEdition = digitalEditions.existsByBookId(book.getId());
        return detail(book, availability(List.of(book)).get(book.getId()), hasDigitalEdition);
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public List<BookSummaryResponse> getDepartmentRecommendations(String department, int limit) {
        if (department == null || department.isBlank()) return List.of();
        String canonical = com.libtrack.auth.Department.canonicalize(department);
        if (canonical == null) return List.of();
        Specification<Book> spec = (root, query, cb) -> cb.and(
                cb.isTrue(root.get("active")),
                cb.equal(root.get("department"), canonical)
        );
        int clampedLimit = Math.min(Math.max(limit, 1), 50);
        Page<Book> page = books.findAll(spec, PageRequest.of(0, clampedLimit, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "title"))));
        Map<UUID, BookAvailability> avail = availability(page.getContent());
        List<UUID> ids = page.getContent().stream().map(Book::getId).toList();
        Set<UUID> digitalIds = ids.isEmpty() ? Set.of() : new HashSet<>(digitalEditions.findBookIdsWithDigitalEdition(ids));
        return page.getContent().stream()
                .map(b -> summary(b, avail.get(b.getId()), digitalIds.contains(b.getId())))
                .toList();
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categories.findAllWithBookCounts();
    }

    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public CatalogueStatisticsResponse statistics() {
        PublicationYearBounds years = books.publicationYearBounds();
        long totalBooks = books.countByActiveTrue();
        long availableBooks = books.countActiveBooksWithAvailableCopies();
        return new CatalogueStatisticsResponse(totalBooks, categories.countDistinctCategoriesUsedByActiveBooks(), copies.countAvailableCopiesForActiveBooks(),
                availableBooks, totalBooks - availableBooks, years.minimumYear(), years.maximumYear());
    }

    /**
     * Ranks each eligible book by one non-duplicated circulation journey in the requested rolling window.
     * Loans are stronger evidence of demand than unfulfilled direct requests or active reservations.
     */
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PageResponse<TrendingBookResponse> trending(String q, String category, Boolean available,
                                                        Integer publicationYearFrom, Integer publicationYearTo,
                                                        int days, int page, int limit) {
        if (days < 1 || days > 90) throw new IllegalArgumentException("Trending period must be between 1 and 90 days.");
        if (page < 0) throw new IllegalArgumentException("Page must be zero or greater.");
        if (limit < 1 || limit > MAX_PAGE_SIZE) throw new IllegalArgumentException("Trending result limit must be between 1 and 100.");
        if (publicationYearFrom != null && publicationYearTo != null && publicationYearFrom > publicationYearTo) {
            throw new IllegalArgumentException("Publication year range start must not exceed its end.");
        }

        Instant cutoff = clock.instant().minus(java.time.Duration.ofDays(days));
        LocalDate loanCutoff = LocalDate.ofInstant(cutoff, clock.getZone());
        Map<UUID, TrendingActivity> activity = new LinkedHashMap<>();
        mergeTrending(activity, loans.countIssuedBooksSince(loanCutoff), TrendingActivity::addIssued);
        mergeTrending(activity, bookReservations.countActiveReservationsSince(cutoff,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)),
                TrendingActivity::addReservation);
        mergeTrending(activity, borrowRequests.countDirectOpenRequestsSince(cutoff,
                List.of(BorrowRequestStatus.PENDING, BorrowRequestStatus.APPROVED)), TrendingActivity::addDirectRequest);

        if (activity.isEmpty()) return new PageResponse<>(List.of(), page, limit, 0, 0);

        var filters = BookSpecifications.search(q, null, null, null, category, available,
                publicationYearFrom, publicationYearTo, activity.keySet());
        List<UUID> filteredBookIds = books.findAll(filters).stream().map(Book::getId).toList();
        List<Book> rankedBooks = filteredBookIds.isEmpty() ? new ArrayList<>() : books.findAllWithDetailsByIdIn(filteredBookIds);
        rankedBooks.sort(Comparator
                .comparingLong((Book book) -> activity.get(book.getId()).score()).reversed()
                .thenComparing(Comparator.comparingLong((Book book) -> activity.get(book.getId()).issuedLoans()).reversed())
                .thenComparing(Comparator.comparingLong((Book book) -> activity.get(book.getId()).activeReservations()).reversed())
                .thenComparing(Comparator.comparingLong((Book book) -> activity.get(book.getId()).directRequests()).reversed())
                .thenComparing(Book::getTitle, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(Book::getId));

        long total = rankedBooks.size();
        int from = Math.min(page * limit, rankedBooks.size());
        int to = Math.min(from + limit, rankedBooks.size());
        List<Book> selected = rankedBooks.subList(from, to);
        Map<UUID, BookAvailability> availabilityByBook = availability(selected);
        Set<UUID> selectedIds = selected.stream().map(Book::getId).collect(Collectors.toSet());
        Set<UUID> digitalIds = selectedIds.isEmpty() ? Set.of() : digitalEditions.findBookIdsWithDigitalEdition(selectedIds);
        List<TrendingBookResponse> content = selected.stream()
                .map(book -> trendingResponse(book, availabilityByBook.get(book.getId()), digitalIds.contains(book.getId()), activity.get(book.getId())))
                .toList();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / limit);
        return new PageResponse<>(content, page, limit, total, totalPages);
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
        String dept = request.department() != null && !request.department().isBlank()
                ? com.libtrack.auth.Department.canonicalize(request.department())
                : "Computer Science and Engineering";
        Book book = new Book(request.title().strip(), IsbnValidator.normalize(request.isbn()), clean(request.description()),
                clean(request.publisher()), request.publicationYear(), clean(request.coverImageUrl()), request.circulationPolicy(),
                dept, names.authors(), names.categories());
        try {
            book = books.saveAndFlush(book);
            if (request.numberOfCopies() != null) createPhysicalCopies(book, request.numberOfCopies().intValueExact(), clean(request.location()));
            wishlistService.notifyWishlistUsersForNewBook(book);
            dispatchNewBookArrivalNotifications(book);
            return detail(book, availability(List.of(book)).get(book.getId()), false);
        } catch (DataIntegrityViolationException exception) { throw new CatalogueConflictException(); }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookDetailResponse updateBook(UUID id, BookRequest request) {
        Book book = books.findById(id).orElseThrow(BookNotFoundException::new);
        SetNames names = resolveNames(request.authors(), request.categories());
        String dept = request.department() != null && !request.department().isBlank()
                ? com.libtrack.auth.Department.canonicalize(request.department())
                : book.getDepartment();
        book.update(request.title().strip(), IsbnValidator.normalize(request.isbn()), clean(request.description()),
                clean(request.publisher()), request.publicationYear(), clean(request.coverImageUrl()), request.circulationPolicy(),
                dept, names.authors(), names.categories());
        try {
            books.flush();
            boolean hasDigital = digitalEditions.existsByBookId(book.getId());
            return detail(book, availability(List.of(book)).get(book.getId()), hasDigital);
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
        BookCopy saved;
        try {
            saved = copies.saveAndFlush(copy);
        } catch (DataIntegrityViolationException exception) {
            throw new CatalogueConflictException();
        }
        reservations.processQueueForCopy(saved);
        return copyResponse(saved);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public List<BookCopyResponse> addCopies(UUID bookId, BookCopyBulkCreateRequest request) {
        Book book = books.findById(bookId).filter(Book::isActive).orElseThrow(BookNotFoundException::new);
        List<BookCopy> newCopies;
        try {
            newCopies = createPhysicalCopies(book, request.numberOfCopies().intValueExact(), clean(request.location()));
        } catch (DataIntegrityViolationException exception) {
            throw new CatalogueConflictException();
        }
        for (BookCopy c : newCopies) {
            reservations.processQueueForCopy(c);
        }
        return newCopies.stream().map(CatalogueService::copyResponse).toList();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookCopyResponse updateCopy(UUID bookId, UUID copyId, BookCopyUpdateRequest request) {
        BookCopy copy = copies.findByIdAndBookId(copyId, bookId).orElseThrow(BookCopyNotFoundException::new);
        if (copy.getStatus() == CopyStatus.ON_LOAN) throw new InvalidCopyStateException();
        CopyStatus newStatus = CopyStatus.valueOf(request.status().name());
        copy.update(request.copyIdentifier() == null ? copy.getCopyIdentifier() : normalizeIdentifier(request.copyIdentifier()),
                request.location() == null ? copy.getLocation() : clean(request.location()), newStatus);
        try {
            copies.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new CatalogueConflictException();
        }
        if (newStatus == CopyStatus.AVAILABLE) {
            reservations.processQueueForCopy(copy);
        }
        return copyResponse(copy);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public BookDetailResponse reconcileInventory(UUID bookId, InventoryReconciliationRequest request) {
        Book book = books.findById(bookId).filter(Book::isActive).orElseThrow(BookNotFoundException::new);
        List<BookCopy> allCopies = copies.findAllByBookIdOrderByCopyIdentifierAsc(bookId);
        int currentTotal = allCopies.size();
        int target = request.targetQuantity();

        if (target > currentTotal) {
            int toAdd = target - currentTotal;
            try {
                List<BookCopy> added = createPhysicalCopies(book, toAdd, clean(request.location()));
                for (BookCopy c : added) {
                    reservations.processQueueForCopy(c);
                }
            } catch (DataIntegrityViolationException exception) {
                throw new CatalogueConflictException("Generated identifier conflicted with existing inventory. Please retry.");
            }
        } else if (target < currentTotal) {
            int toRemove = currentTotal - target;
            List<BookCopy> deletable = copies.findDeletableCopies(bookId);
            if (deletable.size() < toRemove) {
                long onLoan = allCopies.stream().filter(c -> c.getStatus() == CopyStatus.ON_LOAN).count();
                long nonAvailable = allCopies.stream().filter(c -> c.getStatus() != CopyStatus.AVAILABLE && c.getStatus() != CopyStatus.ON_LOAN).count();
                long withHistory = allCopies.stream().filter(c -> c.getStatus() == CopyStatus.AVAILABLE).count() - deletable.size();
                StringBuilder sb = new StringBuilder();
                sb.append("Cannot reduce inventory to ").append(target).append(" copies. ");
                sb.append("Only ").append(deletable.size()).append(" unreferenced available ").append(deletable.size() == 1 ? "copy can" : "copies can").append(" be safely removed. ");
                if (onLoan > 0) sb.append(onLoan).append(" on loan. ");
                if (withHistory > 0) sb.append(withHistory).append(" have past loan history. ");
                if (nonAvailable > 0) sb.append(nonAvailable).append(" are lost, damaged, or withdrawn. ");
                sb.append("Copies with circulation history or non-available status must be managed individually in Manage Physical Copies.");
                throw new CatalogueConflictException(sb.toString().trim());
            }
            try {
                List<BookCopy> toDelete = deletable.subList(0, toRemove);
                copies.deleteAll(toDelete);
                copies.flush();
            } catch (DataIntegrityViolationException exception) {
                throw new CatalogueConflictException("Could not remove copies due to active foreign key references.");
            }
        }

        copies.flush();
        boolean hasDigital = digitalEditions.existsByBookId(book.getId());
        return detail(book, availability(List.of(book)).get(book.getId()), hasDigital);
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
        return copies.summarize(ids, CopyStatus.AVAILABLE, CopyStatus.ON_LOAN, CopyStatus.LOST,
                        CopyStatus.DAMAGED, CopyStatus.WITHDRAWN).stream()
                .collect(Collectors.toMap(BookAvailability::bookId, Function.identity()));
    }

    private static BookSummaryResponse summary(Book book, BookAvailability counts, boolean hasDigitalEdition) {
        long total = counts == null ? 0 : counts.totalCopies();
        long available = counts == null ? 0 : counts.availableCopies();
        long onLoan = counts == null ? 0 : counts.onLoanCopies();
        long lost = counts == null ? 0 : counts.lostCopies();
        long damaged = counts == null ? 0 : counts.damagedCopies();
        long withdrawn = counts == null ? 0 : counts.withdrawnCopies();
        return new BookSummaryResponse(book.getId(), book.getTitle(), book.getIsbn(), sortedAuthors(book), sortedCategories(book),
                book.getPublisher(), book.getPublicationYear(), book.getCoverImageUrl(), book.getCirculationPolicy(),
                total, available, onLoan, lost, damaged, withdrawn, hasDigitalEdition, book.getDepartment());
    }

    private static TrendingBookResponse trendingResponse(Book book, BookAvailability counts, boolean hasDigitalEdition, TrendingActivity activity) {
        long total = counts == null ? 0 : counts.totalCopies();
        long available = counts == null ? 0 : counts.availableCopies();
        long onLoan = counts == null ? 0 : counts.onLoanCopies();
        long lost = counts == null ? 0 : counts.lostCopies();
        long damaged = counts == null ? 0 : counts.damagedCopies();
        long withdrawn = counts == null ? 0 : counts.withdrawnCopies();
        return new TrendingBookResponse(book.getId(), book.getTitle(), book.getIsbn(), sortedAuthors(book), sortedCategories(book),
                book.getPublisher(), book.getPublicationYear(), book.getCoverImageUrl(), book.getCirculationPolicy(),
                total, available, onLoan, lost, damaged, withdrawn, hasDigitalEdition,
                activity.score(), activity.issuedLoans(), activity.activeReservations(), activity.directRequests());
    }

    private static void mergeTrending(Map<UUID, TrendingActivity> activity,
                                      List<TrendingBookActivityProjection> rows,
                                      java.util.function.BiConsumer<TrendingActivity, Long> increment) {
        for (TrendingBookActivityProjection row : rows) {
            increment.accept(activity.computeIfAbsent(row.getBookId(), ignored -> new TrendingActivity()), row.getActivityCount());
        }
    }

    private static BookDetailResponse detail(Book book, BookAvailability counts, boolean hasDigitalEdition) {
        long total = counts == null ? 0 : counts.totalCopies();
        long available = counts == null ? 0 : counts.availableCopies();
        long onLoan = counts == null ? 0 : counts.onLoanCopies();
        long lost = counts == null ? 0 : counts.lostCopies();
        long damaged = counts == null ? 0 : counts.damagedCopies();
        long withdrawn = counts == null ? 0 : counts.withdrawnCopies();
        return new BookDetailResponse(book.getId(), book.getTitle(), book.getIsbn(), book.getDescription(), sortedAuthors(book), sortedCategories(book),
                book.getPublisher(), book.getPublicationYear(), book.getCoverImageUrl(), book.getCirculationPolicy(), book.isActive(),
                total, available, onLoan, lost, damaged, withdrawn, book.getCreatedAt(), book.getUpdatedAt(), hasDigitalEdition, book.getDepartment());
    }

    private List<BookCopy> createPhysicalCopies(Book book, int quantity, String location) {
        List<BookCopy> newCopies = new ArrayList<>(quantity);
        for (int index = 0; index < quantity; index++) {
            newCopies.add(new BookCopy(book, copyIdentifierGenerator.generate(), location));
        }
        return copies.saveAllAndFlush(newCopies);
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
    private static final class TrendingActivity {
        private long issuedLoans;
        private long activeReservations;
        private long directRequests;
        void addIssued(long count) { issuedLoans += count; }
        void addReservation(long count) { activeReservations += count; }
        void addDirectRequest(long count) { directRequests += count; }
        long issuedLoans() { return issuedLoans; }
        long activeReservations() { return activeReservations; }
        long directRequests() { return directRequests; }
        long score() { return issuedLoans * 3 + activeReservations * 2 + directRequests; }
    }

    private void dispatchNewBookArrivalNotifications(Book book) {
        UUID creatorId = null;
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.libtrack.auth.AccountUserDetails details) {
                creatorId = details.getId();
            }
        } catch (Exception ignored) {}

        String bookDept = book.getDepartment() != null && !book.getDepartment().isBlank()
                ? com.libtrack.auth.Department.canonicalize(book.getDepartment())
                : null;
        String authorList = String.join(", ", sortedAuthors(book));
        if (authorList.isBlank()) {
            authorList = "Unknown Author";
        }

        UUID finalCreatorId = creatorId;
        List<UserAccount> eligibleUsers = userAccounts.findAll().stream()
                .filter(UserAccount::isEnabled)
                .filter(u -> finalCreatorId == null || !u.getId().equals(finalCreatorId))
                .toList();

        for (UserAccount user : eligibleUsers) {
            String userDept = user.getDepartment() != null && !user.getDepartment().isBlank()
                    ? com.libtrack.auth.Department.canonicalize(user.getDepartment())
                    : null;

            boolean departmentMatch = bookDept != null && userDept != null && bookDept.equalsIgnoreCase(userDept)
                    && (user.getRole() == AccountRole.STUDENT || user.getRole() == AccountRole.FACULTY);

            if (departmentMatch) {
                if (notificationService.isNotificationAllowed(user.getId(), "DEPARTMENT_BOOK_ARRIVAL")) {
                    notificationService.sendMemberNotification(
                            user.getId(),
                            "New books for your department",
                            "A new book, " + book.getTitle() + ", has been added to your department's collection.",
                            "\"" + book.getTitle() + "\" by " + authorList + " is now available in " + bookDept + ".",
                            "DEPARTMENT_BOOK_ARRIVAL",
                            "BOOK",
                            book.getId(),
                            "/workspace/books/" + book.getId(),
                            "DEPT_BOOK_NEW:" + book.getId() + ":" + user.getId()
                    );
                } else if (notificationService.isNotificationAllowed(user.getId(), "NEW_BOOK_ARRIVAL")) {
                    notificationService.sendMemberNotification(
                            user.getId(),
                            "New Book Added",
                            "\"" + book.getTitle() + "\" by " + authorList + " has been added to the library catalogue.",
                            "A new title is now available in the library catalogue: \"" + book.getTitle() + "\".",
                            "NEW_BOOK_ARRIVAL",
                            "BOOK",
                            book.getId(),
                            "/workspace/books/" + book.getId(),
                            "BOOK_NEW:" + book.getId() + ":" + user.getId()
                    );
                }
            } else {
                if (notificationService.isNotificationAllowed(user.getId(), "NEW_BOOK_ARRIVAL")) {
                    notificationService.sendMemberNotification(
                            user.getId(),
                            "New Book Added",
                            "\"" + book.getTitle() + "\" by " + authorList + " has been added to the library catalogue.",
                            "A new title is now available in the library catalogue: \"" + book.getTitle() + "\".",
                            "NEW_BOOK_ARRIVAL",
                            "BOOK",
                            book.getId(),
                            "/workspace/books/" + book.getId(),
                            "BOOK_NEW:" + book.getId() + ":" + user.getId()
                    );
                }
            }
        }
    }
}
