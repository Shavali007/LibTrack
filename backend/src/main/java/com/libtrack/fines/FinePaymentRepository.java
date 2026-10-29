package com.libtrack.fines;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinePaymentRepository extends JpaRepository<FinePayment, UUID> {
    @Query("select p from FinePayment p join fetch p.recordedBy where p.fine.id = :fineId order by p.paymentDate desc")
    List<FinePayment> findByFineIdWithDetails(@Param("fineId") UUID fineId);

    @Query("select coalesce(sum(p.amount), 0) from FinePayment p")
    BigDecimal sumTotalCollected();
}
