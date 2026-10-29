package com.libtrack.feedback;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.libtrack.auth.UserAccount;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    @Query("select f from Feedback f join fetch f.account order by f.createdAt desc")
    List<Feedback> findAllWithAccountOrderByCreatedAtDesc();

    List<Feedback> findByAccountOrderByCreatedAtDesc(UserAccount account);
}
