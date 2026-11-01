package com.libtrack.review;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.LoanRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookReviewService {

    private final BookReviewRepository reviewRepository;
    private final DigitalEditionAccessRepository digitalAccessRepository;
    private final LoanRepository loanRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final BookRepository bookRepository;
    private final UserAccountRepository userAccountRepository;

    public BookReviewService(
            BookReviewRepository reviewRepository,
            DigitalEditionAccessRepository digitalAccessRepository,
            LoanRepository loanRepository,
            BorrowRequestRepository borrowRequestRepository,
            BookRepository bookRepository,
            UserAccountRepository userAccountRepository) {
        this.reviewRepository = reviewRepository;
        this.digitalAccessRepository = digitalAccessRepository;
        this.loanRepository = loanRepository;
        this.borrowRequestRepository = borrowRequestRepository;
        this.bookRepository = bookRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public Page<BookReviewResponse> getReviews(UUID bookId, Pageable pageable) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException();
        }
        return reviewRepository.findByBookIdOrderByCreatedAtDesc(bookId, pageable)
                .map(BookReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public BookReviewSummaryResponse getSummary(UUID bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException();
        }
        long count = reviewRepository.countByBookId(bookId);
        Double avg = count > 0 ? reviewRepository.getAverageRatingByBookId(bookId) : null;
        return BookReviewSummaryResponse.of(bookId, avg, count);
    }

    @Transactional(readOnly = true)
    public List<BookReviewSummaryResponse> getSummaries(List<UUID> bookIds) {
        if (bookIds == null || bookIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> uniqueIds = new LinkedHashSet<>(bookIds);
        List<Object[]> rawSummaries = reviewRepository.getReviewSummariesByBookIds(uniqueIds);
        Map<UUID, BookReviewSummaryResponse> summaryMap = new HashMap<>();
        for (Object[] row : rawSummaries) {
            UUID bId = (UUID) row[0];
            long count = ((Number) row[1]).longValue();
            Double avg = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            summaryMap.put(bId, BookReviewSummaryResponse.of(bId, avg, count));
        }

        List<BookReviewSummaryResponse> result = new ArrayList<>();
        for (UUID id : uniqueIds) {
            result.add(summaryMap.getOrDefault(id, BookReviewSummaryResponse.of(id, null, 0)));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ReviewEligibilityResponse checkEligibility(UUID bookId, UUID userId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException();
        }

        boolean hasBorrow = loanRepository.existsByBorrower_IdAndCopy_Book_Id(userId, bookId)
                || loanRepository.hasBorrowHistoryForBook(userId, bookId)
                || borrowRequestRepository.existsByBorrower_IdAndBook_IdAndStatus(userId, bookId, BorrowRequestStatus.ISSUED);
        boolean hasDigital = digitalAccessRepository.existsByBook_IdAndUser_Id(bookId, userId)
                || digitalAccessRepository.existsByBookIdAndUserId(bookId, userId);
        boolean alreadyReviewed = reviewRepository.existsByBookIdAndReviewerId(bookId, userId);

        if (alreadyReviewed) {
            return ReviewEligibilityResponse.alreadyReviewed(bookId, hasBorrow, hasDigital);
        }

        if (!hasBorrow && !hasDigital) {
            return ReviewEligibilityResponse.notEligible(bookId, hasBorrow, hasDigital);
        }

        return ReviewEligibilityResponse.eligible(bookId, hasBorrow, hasDigital);
    }

    @Transactional
    public BookReviewResponse createReview(UUID bookId, UUID userId, CreateBookReviewRequest request) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(BookNotFoundException::new);

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));

        ReviewEligibilityResponse eligibility = checkEligibility(bookId, userId);
        if (eligibility.alreadyReviewed()) {
            throw new DuplicateReviewException("You have already reviewed this book.");
        }
        if (!eligibility.eligible()) {
            throw new IneligibleReviewException(eligibility.reason());
        }

        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new InvalidReviewException("Rating must be between 1 and 5.");
        }

        String comment = request.comment();
        if (comment == null || comment.trim().isEmpty()) {
            throw new InvalidReviewException("Review comment is mandatory.");
        }
        String trimmed = comment.trim();
        if (trimmed.length() > 1000) {
            throw new InvalidReviewException("Review comment cannot exceed 1000 characters.");
        }

        BookReview review = new BookReview(book, user, request.rating(), trimmed);
        BookReview saved = reviewRepository.save(review);
        return BookReviewResponse.from(saved);
    }

    @Transactional
    public void recordDigitalAccess(UUID bookId, UUID userId, DigitalAccessType accessType) {
        if (userId == null || bookId == null) {
            return;
        }

        Book book = bookRepository.findById(bookId).orElse(null);
        UserAccount user = userAccountRepository.findById(userId).orElse(null);

        if (book != null && user != null) {
            DigitalEditionAccess access = new DigitalEditionAccess(book, user, accessType);
            digitalAccessRepository.save(access);
        }
    }
}
