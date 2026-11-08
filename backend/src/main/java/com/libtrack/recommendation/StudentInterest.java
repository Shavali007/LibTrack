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
@Table(name = "student_interest", uniqueConstraints = {
    @UniqueConstraint(name = "uq_student_interest_category", columnNames = {"student_account_id", "category_name"})
})
public class StudentInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_account_id", nullable = false)
    private UserAccount studentAccount;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StudentInterest() {}

    public StudentInterest(UserAccount studentAccount, String categoryName) {
        this.studentAccount = studentAccount;
        this.categoryName = categoryName;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UserAccount getStudentAccount() {
        return studentAccount;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
