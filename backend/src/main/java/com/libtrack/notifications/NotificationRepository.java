package com.libtrack.notifications;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.libtrack.auth.AccountRole;

public interface NotificationRepository extends JpaRepository<AppNotification, UUID> {

    @Query("select n from AppNotification n where n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))")
    Page<AppNotification> findForUser(@Param("userId") UUID userId, @Param("role") AccountRole role, Pageable pageable);

    @Query("select n from AppNotification n where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = :isRead")
    Page<AppNotification> findForUserByReadStatus(@Param("userId") UUID userId, @Param("role") AccountRole role, @Param("isRead") boolean isRead, Pageable pageable);

    @Query("select n from AppNotification n where n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role)) order by n.createdAt desc")
    List<AppNotification> findForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Query("select count(n) from AppNotification n where n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))")
    long countForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Query("select count(n) from AppNotification n where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = false")
    long countUnreadForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Query("select count(n) from AppNotification n where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = true")
    long countReadForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Modifying
    @Query("update AppNotification n set n.isRead = true, n.readAt = :readAt where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = false")
    int markAllReadForUser(@Param("userId") UUID userId, @Param("role") AccountRole role, @Param("readAt") Instant readAt);

    @Modifying
    @Query("delete from AppNotification n where n.recipient.id = :userId")
    int deleteForUser(@Param("userId") UUID userId);

    boolean existsByDedupKey(String dedupKey);

    @Query("select n from AppNotification n where n.id = :id and (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role)))")
    Optional<AppNotification> findByIdAndUser(@Param("id") UUID id, @Param("userId") UUID userId, @Param("role") AccountRole role);
}
