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

    @org.springframework.data.jpa.repository.Query("select new com.libtrack.catalogue.CategoryResponse(c.id, c.name, " +
            "(select count(b) from Book b join b.categories bc where bc.id = c.id and b.active = true)) " +
            "from Category c order by c.name asc")
    List<CategoryResponse> findAllWithBookCounts();

    @org.springframework.data.jpa.repository.Query("select count(distinct c.id) from Book b join b.categories c where b.active = true")
    long countDistinctCategoriesUsedByActiveBooks();
}
