package com.libtrack.recommendation;

import com.libtrack.auth.AccountUserDetails;
import com.libtrack.catalogue.CatalogueService;
import com.libtrack.catalogue.DepartmentRecommendationsResponse;
import com.libtrack.catalogue.BookSummaryResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final CatalogueService catalogueService;

    public RecommendationController(RecommendationService recommendationService, CatalogueService catalogueService) {
        this.recommendationService = recommendationService;
        this.catalogueService = catalogueService;
    }

    @PostMapping
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<RecommendationResponse> create(
            @Valid @RequestBody CreateRecommendationRequest request,
            Authentication authentication
    ) {
        UUID facultyId = extractAccountId(authentication);
        RecommendationResponse response = recommendationService.createRecommendation(facultyId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<RecommendationResponse>> getMine(Authentication authentication) {
        UUID facultyId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getMyRecommendations(facultyId));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<RecommendationResponse>> getAll(Authentication authentication) {
        UUID userId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getAllFacultyRecommendations(userId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<RecommendationResponse> update(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateRecommendationRequest request,
            Authentication authentication
    ) {
        UUID facultyId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.updateRecommendationMessage(facultyId, id, request));
    }

    @PostMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<RecommendationResponse> withdraw(
            @PathVariable("id") UUID id,
            Authentication authentication
    ) {
        UUID facultyId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.withdrawRecommendation(facultyId, id));
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<FacultyRecommendationGroupResponse>> getFacultyRecommendationsForStudents(Authentication authentication) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getFacultyRecommendationsForStudents(studentId));
    }

    @GetMapping("/faculty-directory")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<FacultyDirectoryItemResponse>> getFacultyDirectory(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "department", required = false) String department,
            @RequestParam(name = "sort", required = false) String sort
    ) {
        return ResponseEntity.ok(recommendationService.getFacultyDirectory(q, department, sort));
    }

    @GetMapping("/faculty/{facultyId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<FacultyDetailResponse> getFacultyDetails(
            @PathVariable("facultyId") UUID facultyId,
            Authentication authentication
    ) {
        UUID userId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getFacultyDetailsWithRecommendations(facultyId, userId));
    }

    @GetMapping("/top")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<TopRecommendedBookResponse>> getTop(
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getTopRecommendedBooks(limit));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<RecentRecommendationResponse>> getRecent(
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getRecentlyRecommended(limit));
    }

    @GetMapping("/all-books")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<AllRecommendedBookItemResponse>> getAllBooks(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "sort", defaultValue = "most_recommended") String sort,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(recommendationService.getAllRecommendedBooks(q, category, sort, page, size));
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<String>> getDepartments() {
        return ResponseEntity.ok(recommendationService.getDistinctDepartments());
    }

    @GetMapping("/interests")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<StudentInterestsResponse> getInterests(Authentication authentication) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getStudentInterests(studentId));
    }

    @PutMapping("/interests")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<StudentInterestsResponse> updateInterests(
            @RequestBody StudentInterestsRequest request,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.updateStudentInterests(studentId, request));
    }

    @GetMapping("/personalized")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<List<AllRecommendedBookItemResponse>> getPersonalized(Authentication authentication) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getPersonalizedRecommendations(studentId));
    }

    @GetMapping("/department")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<DepartmentRecommendationsResponse> getDepartmentRecommendations(
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            Authentication authentication
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AccountUserDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String dept = details.getDepartment();
        if (dept == null || dept.isBlank()) {
            return ResponseEntity.ok(new DepartmentRecommendationsResponse(null, List.of()));
        }
        List<BookSummaryResponse> books = catalogueService.getDepartmentRecommendations(dept, limit);
        return ResponseEntity.ok(new DepartmentRecommendationsResponse(dept, books));
    }

    @GetMapping("/books/{bookId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<List<RecommendationResponse>> getForBook(
            @PathVariable("bookId") UUID bookId,
            Authentication authentication
    ) {
        UUID userId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.getRecommendationsForBook(bookId, userId));
    }

    @GetMapping("/recommended-book-ids")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<Set<UUID>> getRecommendedBookIds() {
        return ResponseEntity.ok(recommendationService.getRecommendedBookIds());
    }

    @PostMapping("/{id}/helpful")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<HelpfulResponse> markHelpful(
            @PathVariable("id") UUID id,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.markHelpful(studentId, id));
    }

    @DeleteMapping("/{id}/helpful")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<HelpfulResponse> removeHelpful(
            @PathVariable("id") UUID id,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(recommendationService.removeHelpful(studentId, id));
    }

    private UUID extractAccountId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountUserDetails details) {
            return details.getId();
        }
        throw new UnauthorizedRecommendationActionException("Unauthenticated user.");
    }
}
