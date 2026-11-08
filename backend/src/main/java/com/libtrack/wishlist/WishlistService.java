package com.libtrack.wishlist;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.Category;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.notifications.AppNotification;
import com.libtrack.notifications.NotificationService;
import com.libtrack.review.BookReviewService;
import com.libtrack.review.BookReviewSummaryResponse;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserAccountRepository userAccountRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository copyRepository;
    private final BookReviewService reviewService;
    private final NotificationService notificationService;

    public WishlistService(
            WishlistRepository wishlistRepository,
            UserAccountRepository userAccountRepository,
            BookRepository bookRepository,
            BookCopyRepository copyRepository,
            BookReviewService reviewService,
            NotificationService notificationService) {
        this.wishlistRepository = wishlistRepository;
        this.userAccountRepository = userAccountRepository;
        this.bookRepository = bookRepository;
        this.copyRepository = copyRepository;
        this.reviewService = reviewService;
        this.notificationService = notificationService;
    }

    @Transactional
    public WishlistResponse addToWishlist(UUID userId, UUID bookId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("User account not found."));

        if (!user.isEnabled()) {
            throw new AccessDeniedException("Account is not active.");
        }

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException());

        if (!book.isActive()) {
            throw new IllegalArgumentException("Cannot add inactive book to wishlist.");
        }

        Optional<WishlistItem> existing = wishlistRepository.findByUserIdAndBookId(userId, bookId);
        WishlistItem item = existing.orElseGet(() ->
                wishlistRepository.saveAndFlush(new WishlistItem(user, book, Instant.now()))
        );

        long availableCopies = copyRepository.countByBookIdAndStatus(bookId, CopyStatus.AVAILABLE);
        BookReviewSummaryResponse summary = reviewService.getSummary(bookId);
        Double avg = (summary != null && summary.averageRating() != null) ? summary.averageRating() : Double.valueOf(0.0);
        long count = summary != null ? summary.totalReviews() : 0L;

        return WishlistResponse.from(
                item,
                (int) availableCopies,
                avg,
                count
        );
    }

    @Transactional
    public void removeFromWishlist(UUID userId, UUID bookId) {
        wishlistRepository.deleteByUserIdAndBookId(userId, bookId);
    }

    @Transactional(readOnly = true)
    public List<WishlistResponse> getMyWishlist(UUID userId) {
        List<WishlistItem> items = wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (items.isEmpty()) {
            return List.of();
        }

        List<UUID> bookIds = items.stream().map(i -> i.getBook().getId()).toList();
        List<BookReviewSummaryResponse> summaries = reviewService.getSummaries(bookIds);
        Map<UUID, BookReviewSummaryResponse> summaryMap = new HashMap<>();
        for (BookReviewSummaryResponse s : summaries) {
            summaryMap.put(s.bookId(), s);
        }

        return items.stream().map(item -> {
            UUID bId = item.getBook().getId();
            long availableCopies = copyRepository.countByBookIdAndStatus(bId, CopyStatus.AVAILABLE);
            BookReviewSummaryResponse s = summaryMap.get(bId);
            Double avg = (s != null && s.averageRating() != null) ? s.averageRating() : Double.valueOf(0.0);
            long count = s != null ? s.totalReviews() : 0L;
            return WishlistResponse.from(item, (int) availableCopies, avg, count);
        }).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Boolean> getWishlistStatus(UUID userId, List<UUID> bookIds) {
        if (bookIds == null || bookIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<UUID> saved = wishlistRepository.findBookIdsInWishlist(userId, bookIds);
        Map<String, Boolean> result = new HashMap<>();
        for (UUID id : bookIds) {
            result.put(id.toString(), saved.contains(id));
        }
        return result;
    }

    @Transactional
    public int notifyWishlistUsersForNewBook(Book book) {
        if (book == null || !book.isActive() || book.getCategories() == null || book.getCategories().isEmpty()) {
            return 0;
        }

        List<UUID> categoryIds = book.getCategories().stream().map(Category::getId).toList();
        if (categoryIds.isEmpty()) {
            return 0;
        }

        List<WishlistCategoryMatch> matches = wishlistRepository.findWishlistCategoryMatches(
                categoryIds,
                ApprovalStatus.APPROVED,
                List.of(AccountRole.STUDENT, AccountRole.FACULTY)
        );

        if (matches == null || matches.isEmpty()) {
            return 0;
        }

        Map<UUID, Set<String>> userCategoryMatches = new HashMap<>();
        for (WishlistCategoryMatch match : matches) {
            userCategoryMatches.computeIfAbsent(match.getUserId(), k -> new LinkedHashSet<>()).add(match.getCategoryName());
        }

        int count = 0;
        String title = "A new book matches your interests!";
        String actionRoute = "/workspace/books/" + book.getId();

        for (Map.Entry<UUID, Set<String>> entry : userCategoryMatches.entrySet()) {
            UUID recipientId = entry.getKey();
            Set<String> catNames = entry.getValue();
            String categoriesText = String.join(", ", catNames);
            boolean multi = catNames.size() > 1;

            String message = "A new book, " + book.getTitle() + ", has been added to the "
                    + categoriesText + (multi ? " categories" : " category")
                    + ". Since you have books from " + (multi ? "these categories" : "this category")
                    + " in your wishlist, you might be interested in exploring it.";

            String dedupKey = "NEW_BOOK_IN_WISHLIST_CATEGORY:" + book.getId() + ":" + recipientId;

            Optional<AppNotification> sent = notificationService.sendMemberNotification(
                    recipientId,
                    title,
                    message,
                    message,
                    "NEW_BOOK_IN_WISHLIST_CATEGORY",
                    "BOOK",
                    book.getId(),
                    actionRoute,
                    dedupKey
            );

            if (sent.isPresent()) {
                count++;
            }
        }

        return count;
    }
}
