package com.libtrack.circulation;

import java.time.Instant;
import java.util.UUID;
import com.libtrack.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "user_semester_renewal", uniqueConstraints = @UniqueConstraint(name = "uq_user_semester_renewal", columnNames = {"user_id", "semester_code"}))
public class UserSemesterRenewal {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "semester_code", nullable = false, length = 32)
    private String semesterCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @Column(name = "renewed_at", nullable = false, updatable = false)
    private Instant renewedAt;

    protected UserSemesterRenewal() {}

    public UserSemesterRenewal(UserAccount user, String semesterCode, Loan loan, Instant renewedAt) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.semesterCode = semesterCode;
        this.loan = loan;
        this.renewedAt = renewedAt;
    }

    public UUID getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public Loan getLoan() {
        return loan;
    }

    public Instant getRenewedAt() {
        return renewedAt;
    }
}
