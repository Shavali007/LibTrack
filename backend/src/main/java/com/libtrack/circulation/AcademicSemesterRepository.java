package com.libtrack.circulation;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademicSemesterRepository extends JpaRepository<AcademicSemester, UUID> {
    Optional<AcademicSemester> findBySemesterCode(String semesterCode);

    @Query("select s from AcademicSemester s where :date >= s.startDate and :date <= s.endDate")
    Optional<AcademicSemester> findByDate(@Param("date") LocalDate date);
}
