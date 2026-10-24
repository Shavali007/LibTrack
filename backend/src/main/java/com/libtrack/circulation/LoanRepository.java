package com.libtrack.circulation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
public interface LoanRepository extends JpaRepository<Loan,UUID>,JpaSpecificationExecutor<Loan>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select l from Loan l where l.id=:id") Optional<Loan> findByIdForUpdate(@Param("id") UUID id);
 boolean existsByCopy_IdAndStatus(UUID copyId,LoanStatus status);
 Page<Loan> findByBorrower_IdAndStatusOrderByDueDateAsc(UUID borrowerId,LoanStatus status,Pageable pageable);
 Page<Loan> findByBorrower_IdAndStatusNotOrderByIssueDateDesc(UUID borrowerId,LoanStatus status,Pageable pageable);
}


