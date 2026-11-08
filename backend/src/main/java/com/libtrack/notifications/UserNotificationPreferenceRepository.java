package com.libtrack.notifications;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, UUID> {
    Optional<UserNotificationPreference> findByUserAccountId(UUID userAccountId);
    boolean existsByUserAccountId(UUID userAccountId);
}
