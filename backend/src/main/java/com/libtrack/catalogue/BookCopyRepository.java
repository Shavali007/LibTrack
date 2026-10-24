package com.libtrack.catalogue;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookCopyRepository extends JpaRepository<BookCopy, UUID> {
    List<BookCopy> findAllByBookIdOrderByCopyIdentifierAsc(UUID bookId);
    Optional<BookCopy> findByIdAndBookId(UUID id, UUID bookId);

    @Query("select new com.libtrack.catalogue.BookAvailability(c.book.id, count(c), sum(case when c.status = :available then 1 else 0 end)) " +
           "from BookCopy c where c.book.id in :bookIds and c.status <> :withdrawn group by c.book.id")
    List<BookAvailability> summarize(@Param("bookIds") Collection<UUID> bookIds,
                                     @Param("available") CopyStatus available,
                                     @Param("withdrawn") CopyStatus withdrawn);
}
