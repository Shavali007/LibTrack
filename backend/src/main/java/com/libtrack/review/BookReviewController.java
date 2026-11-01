package com.libtrack.review;

import com.libtrack.auth.AccountUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/books")
@Validated
public class BookReviewController {

    private final BookReviewService reviewService;

    public BookReviewController(BookReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/{bookId}/reviews")
    public ResponseEntity<Page<BookReviewResponse>> getReviews(
            @PathVariable UUID bookId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int boundedSize = Math.max(1, Math.min(size, 50));
        int boundedPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(boundedPage, boundedSize);
        return ResponseEntity.ok(reviewService.getReviews(bookId, pageable));
    }

    @GetMapping("/{bookId}/reviews/summary")
    public ResponseEntity<BookReviewSummaryResponse> getSummary(@PathVariable UUID bookId) {
        return ResponseEntity.ok(reviewService.getSummary(bookId));
    }

    @GetMapping("/reviews/summaries")
    public ResponseEntity<List<BookReviewSummaryResponse>> getBatchSummaries(
            @RequestParam(name = "bookIds", required = false) List<UUID> bookIds) {
        return ResponseEntity.ok(reviewService.getSummaries(bookIds));
    }

    @GetMapping("/{bookId}/reviews/eligibility")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewEligibilityResponse> getEligibility(
            @PathVariable UUID bookId,
            Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(reviewService.checkEligibility(bookId, userId));
    }

    @PostMapping("/{bookId}/reviews")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<BookReviewResponse> createReview(
            @PathVariable UUID bookId,
            @Valid @RequestBody CreateBookReviewRequest request,
            Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        BookReviewResponse response = reviewService.createReview(bookId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private static UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountUserDetails aud) {
            return aud.getId();
        }
        return null;
    }
}
