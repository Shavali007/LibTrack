package com.libtrack.recommendation;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRecommendationHelpfulRepository extends JpaRepository<BookRecommendationHelpful, UUID> {

    long countByRecommendationId(UUID recommendationId);

    boolean existsByRecommendationIdAndStudentAccountId(UUID recommendationId, UUID studentAccountId);

    Optional<BookRecommendationHelpful> findByRecommendationIdAndStudentAccountId(UUID recommendationId, UUID studentAccountId);

    void deleteByRecommendationIdAndStudentAccountId(UUID recommendationId, UUID studentAccountId);

    @Query("SELECT h.recommendation.id, COUNT(h) FROM BookRecommendationHelpful h WHERE h.recommendation.id IN :recIds GROUP BY h.recommendation.id")
    List<Object[]> countByRecommendationIds(@Param("recIds") Collection<UUID> recIds);

    @Query("SELECT h.recommendation.id FROM BookRecommendationHelpful h WHERE h.studentAccount.id = :studentId AND h.recommendation.id IN :recIds")
    Set<UUID> findRecommendationIdsByStudentIdAndRecommendationIds(@Param("studentId") UUID studentId, @Param("recIds") Collection<UUID> recIds);
}
