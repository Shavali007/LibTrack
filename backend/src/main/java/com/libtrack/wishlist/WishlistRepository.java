package com.libtrack.wishlist;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;

public interface WishlistRepository extends JpaRepository<WishlistItem, UUID> {

    @EntityGraph(attributePaths = {"book", "book.authors", "book.categories"})
    @Query("select w from WishlistItem w where w.user.id = :userId order by w.createdAt desc")
    List<WishlistItem> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    @Query("select w from WishlistItem w where w.user.id = :userId and w.book.id = :bookId")
    Optional<WishlistItem> findByUserIdAndBookId(@Param("userId") UUID userId, @Param("bookId") UUID bookId);

    @Query("select count(w) > 0 from WishlistItem w where w.user.id = :userId and w.book.id = :bookId")
    boolean existsByUserIdAndBookId(@Param("userId") UUID userId, @Param("bookId") UUID bookId);

    @Query("select w.book.id from WishlistItem w where w.user.id = :userId and w.book.id in :bookIds")
    Set<UUID> findBookIdsInWishlist(@Param("userId") UUID userId, @Param("bookIds") Collection<UUID> bookIds);

    @Modifying
    @Query("delete from WishlistItem w where w.user.id = :userId and w.book.id = :bookId")
    int deleteByUserIdAndBookId(@Param("userId") UUID userId, @Param("bookId") UUID bookId);

    @Query("select distinct w.user.id as userId, c.id as categoryId, c.name as categoryName " +
           "from WishlistItem w " +
           "join w.book b " +
           "join b.categories c " +
           "where c.id in :categoryIds " +
           "and b.active = true " +
           "and w.user.enabled = true " +
           "and w.user.approvalStatus = :status " +
           "and w.user.role in :roles")
    List<WishlistCategoryMatch> findWishlistCategoryMatches(
            @Param("categoryIds") Collection<UUID> categoryIds,
            @Param("status") ApprovalStatus status,
            @Param("roles") Collection<AccountRole> roles
    );
}
