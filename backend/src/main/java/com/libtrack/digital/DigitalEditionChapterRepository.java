package com.libtrack.digital;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DigitalEditionChapterRepository extends JpaRepository<DigitalEditionChapter, UUID> {

    List<DigitalEditionChapter> findByDigitalEdition_IdOrderByStartPageAscChapterNumberAsc(UUID digitalEditionId);

    List<DigitalEditionChapter> findByDigitalEdition_Id(UUID digitalEditionId);

    Optional<DigitalEditionChapter> findByIdAndDigitalEdition_Id(UUID id, UUID digitalEditionId);

    void deleteByDigitalEdition_Id(UUID digitalEditionId);

    void deleteByDigitalEdition_IdAndManuallyEditedFalse(UUID digitalEditionId);

    long countByDigitalEdition_Id(UUID digitalEditionId);

    @Query("SELECT c FROM DigitalEditionChapter c WHERE c.digitalEdition.id = :editionId AND (" +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.content) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY " +
           "CASE WHEN LOWER(c.title) = LOWER(:query) THEN 0 " +
           "     WHEN LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%')) THEN 1 " +
           "     ELSE 2 END, " +
           "c.startPage ASC, c.chapterNumber ASC")
    Page<DigitalEditionChapter> searchLike(
            @Param("editionId") UUID editionId,
            @Param("query") String query,
            Pageable pageable);

    @Query(value = "SELECT * FROM digital_edition_chapter WHERE digital_edition_id = :editionId AND MATCH(title, content) AGAINST(:query IN BOOLEAN MODE) " +
           "ORDER BY CASE WHEN LOWER(title) = LOWER(:query) THEN 0 WHEN LOWER(title) LIKE CONCAT('%', :query, '%') THEN 1 ELSE 2 END, start_page ASC, chapter_number ASC",
           countQuery = "SELECT count(*) FROM digital_edition_chapter WHERE digital_edition_id = :editionId AND MATCH(title, content) AGAINST(:query IN BOOLEAN MODE)",
           nativeQuery = true)
    Page<DigitalEditionChapter> searchFullTextNative(
            @Param("editionId") byte[] editionId,
            @Param("query") String query,
            Pageable pageable);
}
