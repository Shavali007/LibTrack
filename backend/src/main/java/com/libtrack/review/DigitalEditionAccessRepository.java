package com.libtrack.review;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DigitalEditionAccessRepository extends JpaRepository<DigitalEditionAccess, UUID> {

    @Query("select count(d) > 0 from DigitalEditionAccess d where d.book.id = :bookId and d.user.id = :userId")
    boolean existsByBookIdAndUserId(@Param("bookId") UUID bookId, @Param("userId") UUID userId);

    boolean existsByBook_IdAndUser_Id(UUID bookId, UUID userId);

    @Query("select count(d) > 0 from DigitalEditionAccess d where d.book.id = :bookId and d.user.id = :userId and d.accessType = :accessType")
    boolean existsByBookIdAndUserIdAndAccessType(
            @Param("bookId") UUID bookId,
            @Param("userId") UUID userId,
            @Param("accessType") DigitalAccessType accessType
    );
}
