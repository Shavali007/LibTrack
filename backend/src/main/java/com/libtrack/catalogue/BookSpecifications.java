package com.libtrack.catalogue;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

final class BookSpecifications {
    private static final char LIKE_ESCAPE = '\\';
    private BookSpecifications() {}

    static Specification<Book> search(String q, String title, String author, String isbn, String category, Boolean available,
                                      Integer publicationYearFrom, Integer publicationYearTo, Collection<java.util.UUID> bookIds) {
        return search(q, title, author, isbn, category, null, available, publicationYearFrom, publicationYearTo, bookIds, null, null);
    }

    static Specification<Book> search(String q, String title, String author, String isbn, String category, Boolean available,
                                      Integer publicationYearFrom, Integer publicationYearTo, Collection<java.util.UUID> bookIds,
                                      String sortField, String direction) {
        return search(q, title, author, isbn, category, null, available, publicationYearFrom, publicationYearTo, bookIds, sortField, direction);
    }

    static Specification<Book> search(String q, String title, String author, String isbn, String category, String department, Boolean available,
                                      Integer publicationYearFrom, Integer publicationYearTo, Collection<java.util.UUID> bookIds,
                                      String sortField, String direction) {
        return (Root<Book> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            boolean isRatingSort = "rating".equalsIgnoreCase(sortField) || "topRated".equalsIgnoreCase(sortField) || "top-rated".equalsIgnoreCase(sortField);
            if (!isRatingSort) {
                query.distinct(true);
            } else {
                query.distinct(false);
                if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                    Subquery<Double> avgSub = query.subquery(Double.class);
                    Root<com.libtrack.review.BookReview> revAvg = avgSub.from(com.libtrack.review.BookReview.class);
                    avgSub.select(cb.avg(revAvg.get("rating")));
                    avgSub.where(cb.equal(revAvg.get("book"), root));

                    Subquery<Long> countSub = query.subquery(Long.class);
                    Root<com.libtrack.review.BookReview> revCount = countSub.from(com.libtrack.review.BookReview.class);
                    countSub.select(cb.count(revCount));
                    countSub.where(cb.equal(revCount.get("book"), root));

                    Expression<Integer> hasRating = cb.selectCase()
                            .when(cb.isNotNull(avgSub), 1)
                            .otherwise(0)
                            .as(Integer.class);

                    boolean isAsc = "asc".equalsIgnoreCase(direction);
                    if (isAsc) {
                        query.orderBy(
                                cb.desc(hasRating),
                                cb.asc(avgSub),
                                cb.asc(countSub),
                                cb.asc(root.get("title")),
                                cb.asc(root.get("id"))
                        );
                    } else {
                        query.orderBy(
                                cb.desc(hasRating),
                                cb.desc(avgSub),
                                cb.desc(countSub),
                                cb.asc(root.get("title")),
                                cb.asc(root.get("id"))
                        );
                    }
                }
            }
            List<Predicate> filters = new ArrayList<>();
            filters.add(cb.isTrue(root.get("active")));
            addTextFilter(filters, root, cb, query, title, "title", null);
            addTextFilter(filters, root, cb, query, author, null, "author");
            addTextFilter(filters, root, cb, query, isbn, "isbn", null);
            addTextFilter(filters, root, cb, query, category, null, "category");
            if (department != null && !department.isBlank()) {
                String canonical = com.libtrack.auth.Department.canonicalize(department);
                if (canonical != null) {
                    filters.add(cb.equal(root.get("department"), canonical));
                } else {
                    filters.add(cb.like(cb.lower(root.get("department")), pattern(department), LIKE_ESCAPE));
                }
            }
            if (publicationYearFrom != null) filters.add(cb.greaterThanOrEqualTo(root.get("publicationYear"), publicationYearFrom));
            if (publicationYearTo != null) filters.add(cb.lessThanOrEqualTo(root.get("publicationYear"), publicationYearTo));
            if (bookIds != null) filters.add(bookIds.isEmpty() ? cb.disjunction() : root.get("id").in(bookIds));
            if (q != null && !q.isBlank()) {
                String match = pattern(q);
                Predicate fields = cb.or(cb.like(cb.lower(root.get("title")), match, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("publisher")), match, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("isbn")), match, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("description")), match, LIKE_ESCAPE),
                        relationMatch(root, query, cb, match, "authors", "name"),
                        relationMatch(root, query, cb, match, "categories", "name"));
                filters.add(fields);
            }
            if (available != null) {
                Subquery<Integer> copies = query.subquery(Integer.class);
                Root<BookCopy> copy = copies.from(BookCopy.class);
                copies.select(cb.literal(1)).where(cb.equal(copy.get("book"), root), cb.equal(copy.get("status"), CopyStatus.AVAILABLE));
                filters.add(available ? cb.exists(copies) : cb.not(cb.exists(copies)));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }

    private static void addTextFilter(List<Predicate> filters, Root<Book> root, CriteriaBuilder cb, CriteriaQuery<?> query,
                                      String value, String field, String relation) {
        if (value == null || value.isBlank()) return;
        String match = pattern(value);
        filters.add(field != null ? cb.like(cb.lower(root.get(field)), match, LIKE_ESCAPE)
                : relationMatch(root, query, cb, match, relation.equals("author") ? "authors" : "categories", "name"));
    }

    private static Predicate relationMatch(Root<Book> root, CriteriaQuery<?> query, CriteriaBuilder cb, String pattern, String relation, String field) {
        Subquery<Integer> match = query.subquery(Integer.class);
        Root<Book> relatedBook = match.from(Book.class);
        var joined = relatedBook.join(relation);
        match.select(cb.literal(1)).where(cb.equal(relatedBook.get("id"), root.get("id")),
                cb.like(cb.lower(joined.get(field)), pattern, LIKE_ESCAPE));
        return cb.exists(match);
    }

    private static String pattern(String value) {
        return "%" + value.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
