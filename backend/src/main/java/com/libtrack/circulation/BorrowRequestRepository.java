package com.libtrack.circulation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest,UUID>,JpaSpecificationExecutor<BorrowRequest>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from BorrowRequest r where r.id=:id") Optional<BorrowRequest> findByIdForUpdate(@Param("id") UUID id);
 Page<BorrowRequest> findByBorrower_IdOrderBySubmittedAtDesc(UUID borrowerId,Pageable pageable);
 Page<BorrowRequest> findAllByOrderBySubmittedAtDesc(Pageable pageable);
 Page<BorrowRequest> findByStatusOrderBySubmittedAtDesc(BorrowRequestStatus status,Pageable pageable);
}
