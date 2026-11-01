package com.libtrack.review;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookReviewRepository extends JpaRepository<BookReview, UUID> {

    @Query(
            value = "select r from BookReview r join fetch r.reviewer where r.book.id = :bookId order by r.createdAt desc",
            countQuery = "select count(r) from BookReview r where r.book.id = :bookId"
    )
    Page<BookReview> findByBookIdOrderByCreatedAtDesc(@Param("bookId") UUID bookId, Pageable pageable);

    @Query("select r from BookReview r where r.book.id = :bookId and r.reviewer.id = :reviewerId")
    Optional<BookReview> findByBookIdAndReviewerId(@Param("bookId") UUID bookId, @Param("reviewerId") UUID reviewerId);

    @Query("select count(r) > 0 from BookReview r where r.book.id = :bookId and r.reviewer.id = :reviewerId")
    boolean existsByBookIdAndReviewerId(@Param("bookId") UUID bookId, @Param("reviewerId") UUID reviewerId);

    @Query("select count(r) from BookReview r where r.book.id = :bookId")
    long countByBookId(@Param("bookId") UUID bookId);

    @Query("select avg(cast(r.rating as double)) from BookReview r where r.book.id = :bookId")
    Double getAverageRatingByBookId(@Param("bookId") UUID bookId);

    @Query("select r.book.id, count(r), avg(cast(r.rating as double)) from BookReview r where r.book.id in :bookIds group by r.book.id")
    List<Object[]> getReviewSummariesByBookIds(@Param("bookIds") Collection<UUID> bookIds);
}
