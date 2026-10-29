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

    @Query("select new com.libtrack.catalogue.BookAvailability(c.book.id, count(c), " +
           "count(case when c.status = :available then 1 else null end), " +
           "count(case when c.status = :onLoan then 1 else null end), " +
           "count(case when c.status = :lost then 1 else null end), " +
           "count(case when c.status = :damaged then 1 else null end), " +
           "count(case when c.status = :withdrawn then 1 else null end)) " +
           "from BookCopy c where c.book.id in :bookIds group by c.book.id")
    List<BookAvailability> summarize(@Param("bookIds") Collection<UUID> bookIds,
                                     @Param("available") CopyStatus available,
                                     @Param("onLoan") CopyStatus onLoan,
                                     @Param("lost") CopyStatus lost,
                                     @Param("damaged") CopyStatus damaged,
                                     @Param("withdrawn") CopyStatus withdrawn);

    @Query("select c from BookCopy c where c.book.id = :bookId and c.status = com.libtrack.catalogue.CopyStatus.AVAILABLE " +
           "and not exists (select 1 from Loan l where l.copy.id = c.id) " +
           "order by c.createdAt desc, c.copyIdentifier desc")
    List<BookCopy> findDeletableCopies(@Param("bookId") UUID bookId);
}
