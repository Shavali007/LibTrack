package com.libtrack.recommendation;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRecommendationRepository extends JpaRepository<BookRecommendation, UUID> {

    boolean existsByBookIdAndFacultyAccountIdAndStatus(UUID bookId, UUID facultyAccountId, RecommendationStatus status);

    Optional<BookRecommendation> findByBookIdAndFacultyAccountIdAndStatus(UUID bookId, UUID facultyAccountId, RecommendationStatus status);

    @EntityGraph(attributePaths = {"book.authors", "book.categories", "facultyAccount"})
    @Query("SELECT r FROM BookRecommendation r WHERE r.facultyAccount.id = :facultyAccountId ORDER BY r.createdAt DESC")
    List<BookRecommendation> findByFacultyAccountIdWithDetails(@Param("facultyAccountId") UUID facultyAccountId);

    @EntityGraph(attributePaths = {"book.authors", "book.categories", "facultyAccount"})
    @Query("SELECT r FROM BookRecommendation r WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<BookRecommendation> findByStatusWithDetails(@Param("status") RecommendationStatus status);

    @EntityGraph(attributePaths = {"book.authors", "book.categories", "facultyAccount"})
    @Query("SELECT r FROM BookRecommendation r WHERE r.book.id = :bookId AND r.status = :status ORDER BY r.createdAt DESC")
    List<BookRecommendation> findByBookIdAndStatusWithDetails(@Param("bookId") UUID bookId, @Param("status") RecommendationStatus status);

    @Query("SELECT DISTINCT r.book.id FROM BookRecommendation r WHERE r.status = :status")
    Set<UUID> findDistinctBookIdsByStatus(@Param("status") RecommendationStatus status);
}
