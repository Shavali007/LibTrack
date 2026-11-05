package com.libtrack.catalogue;

import java.util.Optional;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, UUID>, JpaSpecificationExecutor<Book> {

    long countByActiveTrue();

    @Query("select count(b) from Book b where b.active = true and exists " +
            "(select c.id from BookCopy c where c.book = b and c.status = com.libtrack.catalogue.CopyStatus.AVAILABLE)")
    long countActiveBooksWithAvailableCopies();

    @Query("select new com.libtrack.catalogue.PublicationYearBounds(min(b.publicationYear), max(b.publicationYear)) from Book b where b.active = true")
    PublicationYearBounds publicationYearBounds();

    @EntityGraph(attributePaths = {"authors", "categories"})
    @Query("SELECT b FROM Book b WHERE b.id = :id")
    Optional<Book> findWithDetailsById(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"authors", "categories"})
    @Query("select distinct b from Book b where b.id in :bookIds")
    List<Book> findAllWithDetailsByIdIn(@Param("bookIds") Collection<UUID> bookIds);
}
