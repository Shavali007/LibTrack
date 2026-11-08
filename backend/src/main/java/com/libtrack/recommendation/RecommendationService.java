package com.libtrack.recommendation;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.Category;
import com.libtrack.notifications.NotificationService;
import com.libtrack.review.BookReviewRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecommendationService {

    private final BookRecommendationRepository recommendationRepository;
    private final BookRecommendationHelpfulRepository helpfulRepository;
    private final BookRepository bookRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationService notificationService;
    private final StudentInterestRepository studentInterestRepository;
    private final BookReviewRepository bookReviewRepository;

    public RecommendationService(
            BookRecommendationRepository recommendationRepository,
            BookRecommendationHelpfulRepository helpfulRepository,
            BookRepository bookRepository,
            UserAccountRepository userAccountRepository,
            NotificationService notificationService,
            StudentInterestRepository studentInterestRepository,
            BookReviewRepository bookReviewRepository
    ) {
        this.recommendationRepository = recommendationRepository;
        this.helpfulRepository = helpfulRepository;
        this.bookRepository = bookRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationService = notificationService;
        this.studentInterestRepository = studentInterestRepository;
        this.bookReviewRepository = bookReviewRepository;
    }

    public RecommendationResponse createRecommendation(UUID facultyId, CreateRecommendationRequest request) {
        UserAccount faculty = userAccountRepository.findById(facultyId)
                .orElseThrow(() -> new UnauthorizedRecommendationActionException("Faculty account not found."));

        if (faculty.getRole() != AccountRole.FACULTY) {
            throw new UnauthorizedRecommendationActionException("Only faculty members can recommend books.");
        }

        Book book = bookRepository.findWithDetailsById(request.bookId())
                .orElseThrow(BookNotFoundException::new);

        if (!book.isActive()) {
            throw new InvalidRecommendationException("Inactive books cannot be recommended.");
        }

        String sanitizedMessage = validateAndSanitizeMessage(request.message());

        if (recommendationRepository.existsByBookIdAndFacultyAccountIdAndStatus(
                book.getId(), faculty.getId(), RecommendationStatus.ACTIVE)) {
            throw new DuplicateRecommendationException("You have already recommended this book.");
        }

        Optional<BookRecommendation> withdrawnRec = recommendationRepository
                .findByBookIdAndFacultyAccountIdAndStatus(book.getId(), faculty.getId(), RecommendationStatus.WITHDRAWN);

        BookRecommendation recommendation;
        if (withdrawnRec.isPresent()) {
            recommendation = withdrawnRec.get();
            recommendation.reactivate(sanitizedMessage);
        } else {
            recommendation = new BookRecommendation(book, faculty, sanitizedMessage);
        }
        BookRecommendation saved = recommendationRepository.saveAndFlush(recommendation);

        List<UserAccount> students = userAccountRepository.findAll().stream()
                .filter(UserAccount::isEnabled)
                .filter(u -> u.getRole() == AccountRole.STUDENT)
                .filter(u -> !u.getId().equals(faculty.getId()))
                .toList();

        for (UserAccount student : students) {
            if (notificationService.isNotificationAllowed(student.getId(), "RECOMMENDATION")) {
                notificationService.sendMemberNotification(
                        student.getId(),
                        "Recommended for You",
                        (faculty.getDisplayName() != null ? faculty.getDisplayName() : "Faculty") + " recommended \"" + book.getTitle() + "\".",
                        sanitizedMessage != null ? sanitizedMessage : "A faculty member recommended this title.",
                        "RECOMMENDATION",
                        "BOOK",
                        book.getId(),
                        "/workspace/books/" + book.getId(),
                        "REC:" + saved.getId() + ":" + student.getId()
                );
            }
        }

        return toResponse(saved, 0, false);
    }

    public RecommendationResponse updateRecommendationMessage(UUID facultyId, UUID recommendationId, UpdateRecommendationRequest request) {
        BookRecommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RecommendationNotFoundException("Recommendation not found."));

        if (!rec.getFacultyAccount().getId().equals(facultyId)) {
            throw new UnauthorizedRecommendationActionException("You can only edit your own recommendations.");
        }

        if (rec.getStatus() == RecommendationStatus.WITHDRAWN) {
            throw new InvalidRecommendationException("Withdrawn recommendations cannot be modified.");
        }

        String sanitizedMessage = validateAndSanitizeMessage(request.message());
        rec.updateMessage(sanitizedMessage);
        BookRecommendation saved = recommendationRepository.saveAndFlush(rec);

        long helpfulCount = helpfulRepository.countByRecommendationId(saved.getId());
        return toResponse(saved, helpfulCount, false);
    }

    public RecommendationResponse withdrawRecommendation(UUID facultyId, UUID recommendationId) {
        BookRecommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RecommendationNotFoundException("Recommendation not found."));

        if (!rec.getFacultyAccount().getId().equals(facultyId)) {
            throw new UnauthorizedRecommendationActionException("You can only withdraw your own recommendations.");
        }

        rec.withdraw();
        BookRecommendation saved = recommendationRepository.saveAndFlush(rec);

        long helpfulCount = helpfulRepository.countByRecommendationId(saved.getId());
        return toResponse(saved, helpfulCount, false);
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> getMyRecommendations(UUID facultyId) {
        List<BookRecommendation> recommendations = recommendationRepository.findByFacultyAccountIdWithDetails(facultyId);
        if (recommendations.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> helpfulCounts = loadHelpfulCounts(recommendations);
        return recommendations.stream()
                .map(r -> toResponse(r, helpfulCounts.getOrDefault(r.getId(), 0L), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> getAllFacultyRecommendations(UUID currentUserId) {
        List<BookRecommendation> recommendations = recommendationRepository.findByStatusWithDetails(RecommendationStatus.ACTIVE);
        if (recommendations.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> helpfulCounts = loadHelpfulCounts(recommendations);
        Set<UUID> studentHelpfulIds = loadStudentHelpfulIds(currentUserId, recommendations);

        return recommendations.stream()
                .map(r -> toResponse(
                        r,
                        helpfulCounts.getOrDefault(r.getId(), 0L),
                        studentHelpfulIds.contains(r.getId())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FacultyRecommendationGroupResponse> getFacultyRecommendationsForStudents(UUID studentId) {
        List<BookRecommendation> recommendations = recommendationRepository.findByStatusWithDetails(RecommendationStatus.ACTIVE);
        if (recommendations.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> helpfulCounts = loadHelpfulCounts(recommendations);
        Set<UUID> studentHelpfulIds = loadStudentHelpfulIds(studentId, recommendations);

        Map<UUID, List<BookRecommendation>> grouped = new LinkedHashMap<>();
        for (BookRecommendation rec : recommendations) {
            grouped.computeIfAbsent(rec.getBook().getId(), k -> new ArrayList<>()).add(rec);
        }

        List<FacultyRecommendationGroupResponse> result = new ArrayList<>();
        for (Map.Entry<UUID, List<BookRecommendation>> entry : grouped.entrySet()) {
            List<BookRecommendation> recs = entry.getValue();
            Book firstBook = recs.get(0).getBook();

            List<FacultyRecommendationGroupResponse.FacultyRecommendationItem> items = recs.stream()
                    .map(r -> new FacultyRecommendationGroupResponse.FacultyRecommendationItem(
                            r.getId(),
                            r.getFacultyAccount().getId(),
                            resolveDisplayName(r.getFacultyAccount()),
                            r.getFacultyAccount().getEmail(),
                            resolveDepartment(r.getFacultyAccount()),
                            r.getMessage(),
                            r.getCreatedAt(),
                            helpfulCounts.getOrDefault(r.getId(), 0L),
                            studentHelpfulIds.contains(r.getId())
                    ))
                    .toList();

            result.add(new FacultyRecommendationGroupResponse(
                    firstBook.getId(),
                    firstBook.getTitle(),
                    firstBook.getIsbn(),
                    firstBook.getCoverImageUrl(),
                    firstBook.getAuthors().stream().map(Author::getName).toList(),
                    firstBook.getCategories().stream().map(Category::getName).toList(),
                    firstBook.getPublicationYear(),
                    recs.size(),
                    items
            ));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> getRecommendationsForBook(UUID bookId, UUID currentUserId) {
        List<BookRecommendation> recommendations = recommendationRepository.findByBookIdAndStatusWithDetails(bookId, RecommendationStatus.ACTIVE);
        if (recommendations.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> helpfulCounts = loadHelpfulCounts(recommendations);
        Set<UUID> studentHelpfulIds = loadStudentHelpfulIds(currentUserId, recommendations);

        return recommendations.stream()
                .map(r -> toResponse(
                        r,
                        helpfulCounts.getOrDefault(r.getId(), 0L),
                        studentHelpfulIds.contains(r.getId())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<UUID> getRecommendedBookIds() {
        return recommendationRepository.findDistinctBookIdsByStatus(RecommendationStatus.ACTIVE);
    }

    public HelpfulResponse markHelpful(UUID studentId, UUID recommendationId) {
        UserAccount student = userAccountRepository.findById(studentId)
                .orElseThrow(() -> new UnauthorizedRecommendationActionException("Student account not found."));

        if (student.getRole() != AccountRole.STUDENT) {
            throw new UnauthorizedRecommendationActionException("Only students can mark recommendations as helpful.");
        }

        BookRecommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RecommendationNotFoundException("Recommendation not found."));

        if (rec.getStatus() != RecommendationStatus.ACTIVE) {
            throw new InvalidRecommendationException("Cannot react to withdrawn recommendations.");
        }

        if (!helpfulRepository.existsByRecommendationIdAndStudentAccountId(rec.getId(), student.getId())) {
            helpfulRepository.save(new BookRecommendationHelpful(rec, student));
        }

        long count = helpfulRepository.countByRecommendationId(rec.getId());
        return new HelpfulResponse(rec.getId(), count, true);
    }

    public HelpfulResponse removeHelpful(UUID studentId, UUID recommendationId) {
        UserAccount student = userAccountRepository.findById(studentId)
                .orElseThrow(() -> new UnauthorizedRecommendationActionException("Student account not found."));

        helpfulRepository.deleteByRecommendationIdAndStudentAccountId(recommendationId, student.getId());
        long count = helpfulRepository.countByRecommendationId(recommendationId);
        return new HelpfulResponse(recommendationId, count, false);
    }

    // =========================================================================
    // NEW METHODS FOR ENHANCED RECOMMENDATIONS MODULE
    // =========================================================================

    @Transactional(readOnly = true)
    public List<FacultyDirectoryItemResponse> getFacultyDirectory(String query, String department, String sort) {
        List<UserAccount> facultyList = userAccountRepository.findAllApprovedFaculty();

        Map<UUID, Long> countMap = new HashMap<>();
        for (Object[] row : recommendationRepository.countActiveRecommendationsByFaculty(RecommendationStatus.ACTIVE)) {
            countMap.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        List<FacultyDirectoryItemResponse> items = new ArrayList<>();
        for (UserAccount faculty : facultyList) {
            items.add(new FacultyDirectoryItemResponse(
                    faculty.getId(),
                    resolveDisplayName(faculty),
                    faculty.getEmail(),
                    resolveDepartment(faculty),
                    resolveDesignation(faculty),
                    faculty.getInstitutionalId() != null ? faculty.getInstitutionalId() : "",
                    countMap.getOrDefault(faculty.getId(), 0L)
            ));
        }

        // Search query filtering (by name, department, employee ID, email)
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase(Locale.ROOT);
            items = items.stream()
                    .filter(item -> (item.displayName() != null && item.displayName().toLowerCase(Locale.ROOT).contains(q))
                            || (item.department() != null && item.department().toLowerCase(Locale.ROOT).contains(q))
                            || (item.institutionalId() != null && item.institutionalId().toLowerCase(Locale.ROOT).contains(q))
                            || (item.email() != null && item.email().toLowerCase(Locale.ROOT).contains(q)))
                    .toList();
        }

        // Department filtering
        if (department != null && !department.isBlank()
                && !"ALL".equalsIgnoreCase(department.trim())
                && !"All Departments".equalsIgnoreCase(department.trim())) {
            String deptFilter = department.trim().replace('+', ' ').toLowerCase(Locale.ROOT);
            items = items.stream()
                    .filter(item -> item.department() != null && (item.department().toLowerCase(Locale.ROOT).equals(deptFilter)
                            || item.department().toLowerCase(Locale.ROOT).contains(deptFilter)))
                    .toList();
        }

        // Sorting
        List<FacultyDirectoryItemResponse> mutableItems = new ArrayList<>(items);
        if ("most_recommended".equalsIgnoreCase(sort) || "recommendations_desc".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparingLong(FacultyDirectoryItemResponse::recommendationCount).reversed()
                    .thenComparing(FacultyDirectoryItemResponse::displayName, String.CASE_INSENSITIVE_ORDER));
        } else if ("least_recommended".equalsIgnoreCase(sort) || "recommendations_asc".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparingLong(FacultyDirectoryItemResponse::recommendationCount)
                    .thenComparing(FacultyDirectoryItemResponse::displayName, String.CASE_INSENSITIVE_ORDER));
        } else if ("name_desc".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparing(FacultyDirectoryItemResponse::displayName, String.CASE_INSENSITIVE_ORDER).reversed());
        } else if ("name_asc".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparing(FacultyDirectoryItemResponse::displayName, String.CASE_INSENSITIVE_ORDER));
        } else {
            // Default: Most recommendations first, then alphabetical
            mutableItems.sort(Comparator.comparingLong(FacultyDirectoryItemResponse::recommendationCount).reversed()
                    .thenComparing(FacultyDirectoryItemResponse::displayName, String.CASE_INSENSITIVE_ORDER));
        }

        return mutableItems;
    }

    @Transactional(readOnly = true)
    public FacultyDetailResponse getFacultyDetailsWithRecommendations(UUID facultyId, UUID currentUserId) {
        UserAccount faculty = userAccountRepository.findById(facultyId)
                .orElseThrow(() -> new RecommendationNotFoundException("Faculty member not found."));

        if (faculty.getRole() != AccountRole.FACULTY) {
            throw new RecommendationNotFoundException("User is not a faculty member.");
        }

        List<BookRecommendation> recs = recommendationRepository.findByFacultyAccountIdAndStatusWithDetails(
                facultyId, RecommendationStatus.ACTIVE
        );

        Map<UUID, Long> helpfulCounts = loadHelpfulCounts(recs);
        Set<UUID> studentHelpfulIds = loadStudentHelpfulIds(currentUserId, recs);

        Set<UUID> bookIds = recs.stream().map(r -> r.getBook().getId()).collect(java.util.stream.Collectors.toSet());
        Map<UUID, ReviewStat> reviewStats = loadReviewStats(bookIds);

        List<FacultyBookItemResponse> books = recs.stream().map(r -> {
            Book b = r.getBook();
            ReviewStat stat = reviewStats.getOrDefault(b.getId(), ReviewStat.EMPTY);
            return new FacultyBookItemResponse(
                    r.getId(),
                    b.getId(),
                    b.getTitle(),
                    b.getIsbn(),
                    b.getCoverImageUrl(),
                    b.getAuthors().stream().map(Author::getName).toList(),
                    b.getCategories().stream().map(Category::getName).toList(),
                    b.getPublicationYear(),
                    stat.averageRating(),
                    stat.reviewCount(),
                    r.getMessage(),
                    r.getCreatedAt(),
                    helpfulCounts.getOrDefault(r.getId(), 0L),
                    studentHelpfulIds.contains(r.getId())
            );
        }).toList();

        return new FacultyDetailResponse(
                faculty.getId(),
                resolveDisplayName(faculty),
                faculty.getEmail(),
                resolveDepartment(faculty),
                resolveDesignation(faculty),
                faculty.getInstitutionalId(),
                books.size(),
                books
        );
    }

    @Transactional(readOnly = true)
    public List<TopRecommendedBookResponse> getTopRecommendedBooks(int limit) {
        int safeLimit = Math.max(limit, 1);
        List<Object[]> rawStats = recommendationRepository.findTopRecommendedBookStats(PageRequest.of(0, safeLimit));
        if (rawStats.isEmpty()) {
            return List.of();
        }

        List<UUID> bookIds = rawStats.stream().map(row -> (UUID) row[0]).toList();
        Map<UUID, Book> bookMap = bookRepository.findAllWithDetailsByIdIn(bookIds).stream()
                .collect(java.util.stream.Collectors.toMap(Book::getId, b -> b));

        List<TopRecommendedBookResponse> result = new ArrayList<>();
        for (Object[] row : rawStats) {
            UUID bookId = (UUID) row[0];
            Book book = bookMap.get(bookId);
            if (book == null) continue;
            long distinctFacultyCount = ((Number) row[1]).longValue();
            long totalRecommendations = ((Number) row[2]).longValue();
            result.add(new TopRecommendedBookResponse(
                    book.getId(),
                    book.getTitle(),
                    book.getCoverImageUrl(),
                    book.getAuthors().stream().map(Author::getName).toList(),
                    book.getCategories().stream().map(Category::getName).toList(),
                    distinctFacultyCount,
                    totalRecommendations
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<RecentRecommendationResponse> getRecentlyRecommended(int limit) {
        int safeLimit = Math.max(limit, 1);
        List<BookRecommendation> recs = recommendationRepository.findRecentRecommendations(
                RecommendationStatus.ACTIVE,
                PageRequest.of(0, safeLimit)
        );
        return recs.stream().map(r -> new RecentRecommendationResponse(
                r.getId(),
                r.getBook().getId(),
                r.getBook().getTitle(),
                r.getBook().getCoverImageUrl(),
                r.getFacultyAccount().getId(),
                resolveDisplayName(r.getFacultyAccount()),
                resolveDepartment(r.getFacultyAccount()),
                r.getCreatedAt()
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<AllRecommendedBookItemResponse> getAllRecommendedBooks(String query, String category, String sort, int page, int size) {
        List<BookRecommendation> recommendations = recommendationRepository.findByStatusWithDetails(RecommendationStatus.ACTIVE);
        if (recommendations.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<BookRecommendation>> grouped = new LinkedHashMap<>();
        for (BookRecommendation rec : recommendations) {
            grouped.computeIfAbsent(rec.getBook().getId(), k -> new ArrayList<>()).add(rec);
        }

        Map<UUID, ReviewStat> reviewStats = loadReviewStats(grouped.keySet());

        List<AllRecommendedBookItemResponse> items = new ArrayList<>();
        for (Map.Entry<UUID, List<BookRecommendation>> entry : grouped.entrySet()) {
            List<BookRecommendation> recs = entry.getValue();
            Book book = recs.get(0).getBook();

            long distinctFacultyCount = recs.stream()
                    .map(r -> r.getFacultyAccount().getId())
                    .distinct()
                    .count();
            long totalRecommendations = recs.size();

            Instant latestCreatedAt = recs.stream()
                    .map(BookRecommendation::getCreatedAt)
                    .max(Instant::compareTo)
                    .orElse(Instant.now());

            List<ContributingFacultyResponse> contributors = recs.stream()
                    .map(r -> new ContributingFacultyResponse(
                            r.getId(),
                            r.getFacultyAccount().getId(),
                            resolveDisplayName(r.getFacultyAccount()),
                            resolveDepartment(r.getFacultyAccount()),
                            r.getMessage(),
                            r.getCreatedAt()
                    ))
                    .toList();

            ReviewStat stat = reviewStats.getOrDefault(book.getId(), ReviewStat.EMPTY);

            items.add(new AllRecommendedBookItemResponse(
                    book.getId(),
                    book.getTitle(),
                    book.getIsbn(),
                    book.getCoverImageUrl(),
                    book.getAuthors().stream().map(Author::getName).toList(),
                    book.getCategories().stream().map(Category::getName).toList(),
                    book.getPublicationYear(),
                    distinctFacultyCount,
                    totalRecommendations,
                    stat.averageRating(),
                    stat.reviewCount(),
                    latestCreatedAt,
                    contributors
            ));
        }

        // Query filter: title, authors, ISBN
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase(Locale.ROOT);
            items = items.stream().filter(item ->
                    (item.title() != null && item.title().toLowerCase(Locale.ROOT).contains(q))
                            || (item.isbn() != null && item.isbn().toLowerCase(Locale.ROOT).contains(q))
                            || item.authors().stream().anyMatch(a -> a.toLowerCase(Locale.ROOT).contains(q))
            ).toList();
        }

        // Category filter
        if (category != null && !category.isBlank()
                && !"ALL".equalsIgnoreCase(category.trim())
                && !"All Categories".equalsIgnoreCase(category.trim())) {
            String catFilter = category.trim().toLowerCase(Locale.ROOT);
            items = items.stream().filter(item ->
                    item.categories().stream().anyMatch(c -> c.toLowerCase(Locale.ROOT).equals(catFilter))
            ).toList();
        }

        // Sort
        List<AllRecommendedBookItemResponse> mutableItems = new ArrayList<>(items);
        if ("recent".equalsIgnoreCase(sort) || "recently_recommended".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparing(AllRecommendedBookItemResponse::latestCreatedAt).reversed());
        } else if ("rating".equalsIgnoreCase(sort) || "highest_rated".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparing(AllRecommendedBookItemResponse::averageRating, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparingLong(AllRecommendedBookItemResponse::reviewCount).reversed());
        } else if ("title".equalsIgnoreCase(sort) || "title_asc".equalsIgnoreCase(sort)) {
            mutableItems.sort(Comparator.comparing(AllRecommendedBookItemResponse::title, String.CASE_INSENSITIVE_ORDER));
        } else {
            // Default: Most Recommended (distinct faculty count desc, total desc, latest desc)
            mutableItems.sort(Comparator.comparingLong(AllRecommendedBookItemResponse::distinctFacultyCount).reversed()
                    .thenComparingLong(AllRecommendedBookItemResponse::totalRecommendations).reversed()
                    .thenComparing(AllRecommendedBookItemResponse::latestCreatedAt).reversed());
        }

        // Pagination
        int safePage = Math.max(page, 0);
        int safeSize = size > 0 ? size : 20;
        int fromIndex = safePage * safeSize;
        if (fromIndex >= mutableItems.size()) {
            return List.of();
        }
        int toIndex = Math.min(fromIndex + safeSize, mutableItems.size());
        return mutableItems.subList(fromIndex, toIndex);
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctDepartments() {
        List<UserAccount> facultyList = userAccountRepository.findAllApprovedFaculty();
        return facultyList.stream()
                .map(this::resolveDepartment)
                .filter(d -> d != null && !d.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentInterestsResponse getStudentInterests(UUID studentId) {
        List<String> categories = studentInterestRepository.findCategoryNamesByStudentAccountId(studentId);
        return new StudentInterestsResponse(categories);
    }

    public StudentInterestsResponse updateStudentInterests(UUID studentId, StudentInterestsRequest request) {
        UserAccount student = userAccountRepository.findById(studentId)
                .orElseThrow(() -> new UnauthorizedRecommendationActionException("Student account not found."));

        studentInterestRepository.deleteByStudentAccountId(studentId);

        List<String> savedCategories = new ArrayList<>();
        if (request != null && request.categories() != null) {
            Set<String> cleanCats = new HashSet<>();
            for (String cat : request.categories()) {
                if (cat != null && !cat.isBlank()) {
                    String clean = cat.trim();
                    if (clean.length() <= 100 && cleanCats.add(clean.toLowerCase(Locale.ROOT))) {
                        studentInterestRepository.save(new StudentInterest(student, clean));
                        savedCategories.add(clean);
                    }
                }
            }
        }

        Collections.sort(savedCategories, String.CASE_INSENSITIVE_ORDER);
        return new StudentInterestsResponse(savedCategories);
    }

    @Transactional(readOnly = true)
    public List<AllRecommendedBookItemResponse> getPersonalizedRecommendations(UUID studentId) {
        List<String> interests = studentInterestRepository.findCategoryNamesByStudentAccountId(studentId);
        if (interests.isEmpty()) {
            return List.of();
        }

        Set<String> interestSet = new HashSet<>();
        for (String s : interests) {
            interestSet.add(s.trim().toLowerCase(Locale.ROOT));
        }

        // Get all recommended books and prioritize those matching student interests
        List<AllRecommendedBookItemResponse> allRecs = getAllRecommendedBooks(null, null, "most_recommended", 0, 100);

        List<AllRecommendedBookItemResponse> matching = allRecs.stream().filter(book ->
                book.categories().stream().anyMatch(c -> interestSet.contains(c.toLowerCase(Locale.ROOT)))
        ).toList();

        return matching;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private record ReviewStat(Double averageRating, long reviewCount) {
        static final ReviewStat EMPTY = new ReviewStat(null, 0L);
    }

    private Map<UUID, ReviewStat> loadReviewStats(Collection<UUID> bookIds) {
        if (bookIds == null || bookIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> raw = bookReviewRepository.getReviewSummariesByBookIds(bookIds);
        Map<UUID, ReviewStat> map = new HashMap<>();
        for (Object[] row : raw) {
            UUID bId = (UUID) row[0];
            long count = ((Number) row[1]).longValue();
            Double avg = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            if (avg != null) {
                avg = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue();
            }
            map.put(bId, new ReviewStat(avg, count));
        }
        return map;
    }

    private String validateAndSanitizeMessage(String message) {
        if (message == null) {
            return null;
        }
        String trimmed = message.trim();
        if (!message.isEmpty() && trimmed.isEmpty()) {
            throw new InvalidRecommendationException("Recommendation message cannot contain only whitespace.");
        }
        if (trimmed.length() > 300) {
            throw new InvalidRecommendationException("Recommendation message cannot exceed 300 characters.");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<UUID, Long> loadHelpfulCounts(Collection<BookRecommendation> recommendations) {
        Set<UUID> ids = recommendations.stream().map(BookRecommendation::getId).collect(java.util.stream.Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        List<Object[]> raw = helpfulRepository.countByRecommendationIds(ids);
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : raw) {
            map.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private Set<UUID> loadStudentHelpfulIds(UUID studentId, Collection<BookRecommendation> recommendations) {
        if (studentId == null) {
            return Collections.emptySet();
        }
        Set<UUID> ids = recommendations.stream().map(BookRecommendation::getId).collect(java.util.stream.Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptySet();
        }
        return helpfulRepository.findRecommendationIdsByStudentIdAndRecommendationIds(studentId, ids);
    }

    private RecommendationResponse toResponse(BookRecommendation r, long helpfulCount, boolean markedHelpful) {
        Book b = r.getBook();
        UserAccount f = r.getFacultyAccount();

        return new RecommendationResponse(
                r.getId(),
                b.getId(),
                b.getTitle(),
                b.getIsbn(),
                b.getCoverImageUrl(),
                b.getAuthors().stream().map(Author::getName).toList(),
                b.getCategories().stream().map(Category::getName).toList(),
                b.getPublicationYear(),
                f.getId(),
                resolveDisplayName(f),
                f.getEmail(),
                resolveDepartment(f),
                r.getMessage(),
                r.getStatus().name(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                r.getWithdrawnAt(),
                helpfulCount,
                markedHelpful
        );
    }

    private String resolveDisplayName(UserAccount user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        return user.getEmail();
    }

    private String resolveDepartment(UserAccount user) {
        if (user.getDepartment() != null && !user.getDepartment().isBlank()) {
            return user.getDepartment();
        }
        return "Computer Science and Engineering";
    }

    private String resolveDesignation(UserAccount user) {
        return "Associate Professor";
    }
}
