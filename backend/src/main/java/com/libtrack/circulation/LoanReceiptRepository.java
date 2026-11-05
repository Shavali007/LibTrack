package com.libtrack.circulation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanReceiptRepository extends JpaRepository<LoanReceipt, UUID> {
    Optional<LoanReceipt> findByLoan_Id(UUID loanId);
    Optional<LoanReceipt> findByReceiptNumber(String receiptNumber);
    boolean existsByLoan_Id(UUID loanId);
}
