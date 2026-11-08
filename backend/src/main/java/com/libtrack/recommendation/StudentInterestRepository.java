package com.libtrack.recommendation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentInterestRepository extends JpaRepository<StudentInterest, UUID> {

    @Query("SELECT s.categoryName FROM StudentInterest s WHERE s.studentAccount.id = :studentId ORDER BY s.categoryName ASC")
    List<String> findCategoryNamesByStudentAccountId(@Param("studentId") UUID studentId);

    @Modifying
    @Query("DELETE FROM StudentInterest s WHERE s.studentAccount.id = :studentId")
    void deleteByStudentAccountId(@Param("studentId") UUID studentId);
}
