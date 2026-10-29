package com.libtrack.notifications;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.libtrack.auth.AccountRole;

public interface NotificationRepository extends JpaRepository<AppNotification, UUID> {
    @Query("select n from AppNotification n where n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role)) order by n.createdAt desc")
    List<AppNotification> findForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Query("select count(n) from AppNotification n where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = false")
    long countUnreadForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);

    @Modifying
    @Query("update AppNotification n set n.isRead = true where (n.recipient.id = :userId or (n.recipient is null and (n.targetRole is null or n.targetRole = :role))) and n.isRead = false")
    int markAllReadForUser(@Param("userId") UUID userId, @Param("role") AccountRole role);
}
