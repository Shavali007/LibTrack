package com.libtrack.recommendation;

import com.libtrack.auth.AccountUserDetails;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
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

