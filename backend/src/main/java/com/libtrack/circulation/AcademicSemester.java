package com.libtrack.circulation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "academic_semester", uniqueConstraints = @UniqueConstraint(name = "uq_academic_semester_code", columnNames = "semester_code"))
public class AcademicSemester {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "semester_code", nullable = false, unique = true, length = 32)
    private String semesterCode;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AcademicSemester() {}

    public AcademicSemester(String semesterCode, String name, LocalDate startDate, LocalDate endDate) {
        this.id = UUID.randomUUID();
        this.semesterCode = semesterCode;
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getSemesterCode() {
        return semesterCode;
    }

    public String getName() {
        return name;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
