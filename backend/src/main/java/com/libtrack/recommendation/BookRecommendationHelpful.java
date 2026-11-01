package com.libtrack.recommendation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "book_recommendation_helpful", uniqueConstraints = {
    @UniqueConstraint(name = "uq_recommendation_student", columnNames = {"recommendation_id", "student_account_id"})
})
public class BookRecommendationHelpful {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recommendation_id", nullable = false)
    private BookRecommendation recommendation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_account_id", nullable = false)
    private UserAccount studentAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BookRecommendationHelpful() {}

    public BookRecommendationHelpful(BookRecommendation recommendation, UserAccount studentAccount) {
        this.recommendation = recommendation;
        this.studentAccount = studentAccount;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public BookRecommendation getRecommendation() {
        return recommendation;
    }

    public UserAccount getStudentAccount() {
        return studentAccount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
