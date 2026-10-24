package com.libtrack.catalogue;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, UUID> {
    Optional<Author> findByNormalizedName(String normalizedName);
    List<Author> findAllByNormalizedNameIn(Collection<String> normalizedNames);
}
