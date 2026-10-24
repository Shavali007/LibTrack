package com.libtrack.catalogue;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

final class BookSpecifications {
    private static final char LIKE_ESCAPE = '\\';
    private BookSpecifications() {}

    static Specification<Book> search(String q, String title, String author, String isbn, String category, Boolean available) {
        return (Root<Book> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            query.distinct(true);
            List<Predicate> filters = new ArrayList<>();
            filters.add(cb.isTrue(root.get("active")));
            addTextFilter(filters, root, cb, query, title, "title", null);
            addTextFilter(filters, root, cb, query, author, null, "author");
            addTextFilter(filters, root, cb, query, isbn, "isbn", null);
            addTextFilter(filters, root, cb, query, category, null, "category");
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
