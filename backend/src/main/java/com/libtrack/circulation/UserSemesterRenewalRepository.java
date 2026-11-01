package com.libtrack.circulation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSemesterRenewalRepository extends JpaRepository<UserSemesterRenewal, UUID> {
    boolean existsByUser_IdAndSemesterCode(UUID userId, String semesterCode);

    Optional<UserSemesterRenewal> findByUser_IdAndSemesterCode(UUID userId, String semesterCode);
}
