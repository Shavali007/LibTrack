package com.libtrack.wishlist;

import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.Category;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WishlistResponse(
        UUID id,
        UUID bookId,
        String title,
        List<String> authors,
        String coverImageUrl,
        String category,
        String publisher,
        Integer publicationYear,
        int availableCopies,
        boolean available,
        Double averageRating,
        long reviewCount,
        Instant addedAt
) {
    public static WishlistResponse from(WishlistItem item, int availableCopies, Double avgRating, long reviewCount) {
        Book b = item.getBook();
        List<String> authorNames = b.getAuthors() != null
                ? b.getAuthors().stream().map(Author::getName).toList()
                : List.of();
        String primaryCategory = (b.getCategories() != null && !b.getCategories().isEmpty())
                ? b.getCategories().iterator().next().getName()
                : "General";

        return new WishlistResponse(
                item.getId(),
                b.getId(),
                b.getTitle(),
                authorNames,
                b.getCoverImageUrl(),
                primaryCategory,
                b.getPublisher(),
                b.getPublicationYear(),
                availableCopies,
                availableCopies > 0,
                avgRating != null ? avgRating : 0.0,
                reviewCount,
                item.getCreatedAt()
        );
    }
}
