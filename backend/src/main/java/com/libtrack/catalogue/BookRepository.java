package com.libtrack.catalogue;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, UUID>, JpaSpecificationExecutor<Book> {

    @EntityGraph(attributePaths = {"authors", "categories"})
    @Query("SELECT b FROM Book b WHERE b.id = :id")
    Optional<Book> findWithDetailsById(@Param("id") UUID id);
}
