package com.libtrack.recommendation;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.Category;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.notifications.NotificationService;

@Service
@Transactional
public class RecommendationService {

    private final BookRecommendationRepository recommendationRepository;
    private final BookRecommendationHelpfulRepository helpfulRepository;
    private final BookRepository bookRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationService notificationService;

    public RecommendationService(
            BookRecommendationRepository recommendationRepository,
            BookRecommendationHelpfulRepository helpfulRepository,
            BookRepository bookRepository,
            UserAccountRepository userAccountRepository,
            NotificationService notificationService
    ) {
        this.recommendationRepository = recommendationRepository;
        this.helpfulRepository = helpfulRepository;
        this.bookRepository = bookRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationService = notificationService;
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

        notificationService.sendRoleNotification(
                AccountRole.STUDENT,
                "Recommended for You",
                (faculty.getDisplayName() != null ? faculty.getDisplayName() : "Faculty") + " recommended \"" + book.getTitle() + "\".",
                sanitizedMessage != null ? sanitizedMessage : "A faculty member recommended this title.",
                "RECOMMENDATION",
                "BOOK",
                book.getId(),
                "/workspace/books/" + book.getId(),
                "REC:" + saved.getId()
        );

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

        // Group by Book while preserving order of newest recommendations
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
        return "Faculty Member";
    }
}
