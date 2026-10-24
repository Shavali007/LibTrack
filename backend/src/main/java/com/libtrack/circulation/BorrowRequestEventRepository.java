package com.libtrack.circulation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface BorrowRequestEventRepository extends JpaRepository<BorrowRequestEvent,UUID>{
 @Query("select e from BorrowRequestEvent e where e.request.id=:requestId order by e.occurredAt asc") List<BorrowRequestEvent> history(@Param("requestId") UUID requestId);
}
