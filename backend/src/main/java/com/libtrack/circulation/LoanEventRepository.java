package com.libtrack.circulation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface LoanEventRepository extends JpaRepository<LoanEvent,UUID>{
 @Query("select e from LoanEvent e where e.loan.id=:loanId order by e.occurredAt asc") List<LoanEvent> history(@Param("loanId") UUID loanId);
}
