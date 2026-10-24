package com.libtrack.catalogue;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findByNormalizedName(String normalizedName);
    List<Category> findAllByNormalizedNameIn(Collection<String> normalizedNames);
    List<Category> findAllByOrderByNameAsc();
}
