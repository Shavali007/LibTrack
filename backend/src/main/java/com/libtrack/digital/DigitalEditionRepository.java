package com.libtrack.digital;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DigitalEditionRepository extends JpaRepository<DigitalEdition, UUID> {
    Optional<DigitalEdition> findByBookId(UUID bookId);
    boolean existsByBookId(UUID bookId);
    void deleteByBookId(UUID bookId);

    @Query("select d.book.id from DigitalEdition d where d.book.id in :bookIds")
    Set<UUID> findBookIdsWithDigitalEdition(@Param("bookIds") Collection<UUID> bookIds);
}
