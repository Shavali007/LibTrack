package com.libtrack.fines;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FineRepository extends JpaRepository<Fine, UUID> {
    Optional<Fine> findByLoan_Id(UUID loanId);

    @Query("select f from Fine f join fetch f.loan l join fetch l.copy c join fetch c.book b join fetch f.borrower u order by f.assessedAt desc")
    List<Fine> findAllWithDetails();

    @Query("select f from Fine f join fetch f.loan l join fetch l.copy c join fetch c.book b join fetch f.borrower u where f.borrower.id = :borrowerId order by f.assessedAt desc")
    List<Fine> findByBorrowerIdWithDetails(@Param("borrowerId") UUID borrowerId);

    long countByStatus(FineStatus status);

    @Query("select coalesce(sum(f.fineAmount), 0) from Fine f where f.status = 'UNPAID'")
    BigDecimal sumUnpaidFines();

    @Query("select coalesce(sum(f.fineAmount), 0) from Fine f where f.status = 'PAID'")
    BigDecimal sumPaidFines();

    long countByBorrower_Id(UUID borrowerId);

    long countByBorrower_IdAndStatus(UUID borrowerId, FineStatus status);

    @Query("select coalesce(sum(f.fineAmount), 0) from Fine f where f.borrower.id = :borrowerId and f.status = 'UNPAID'")
    BigDecimal sumUnpaidFinesByBorrower(@Param("borrowerId") UUID borrowerId);

    @Query("select coalesce(sum(f.fineAmount), 0) from Fine f where f.borrower.id = :borrowerId and f.status = 'PAID'")
    BigDecimal sumPaidFinesByBorrower(@Param("borrowerId") UUID borrowerId);
}
