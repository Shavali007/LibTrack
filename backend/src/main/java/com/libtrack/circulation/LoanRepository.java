package com.libtrack.circulation;

import java.time.LocalDate;
import java.util.Collection;
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

public interface LoanRepository extends JpaRepository<Loan, UUID>, JpaSpecificationExecutor<Loan> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Loan l where l.id=:id")
    Optional<Loan> findByIdForUpdate(@Param("id") UUID id);

    boolean existsByCopy_IdAndStatus(UUID copyId, LoanStatus status);

    Page<Loan> findByBorrower_IdAndStatusOrderByDueDateAsc(UUID borrowerId, LoanStatus status, Pageable pageable);

    Page<Loan> findByBorrower_IdAndStatusNotOrderByIssueDateDesc(UUID borrowerId, LoanStatus status, Pageable pageable);

    List<Loan> findByBorrower_IdAndStatusOrderByDueDateAsc(UUID borrowerId, LoanStatus status);

    List<Loan> findByBorrower_IdAndStatusNotOrderByIssueDateDesc(UUID borrowerId, LoanStatus status);

    long countByBorrower_IdAndStatus(UUID borrowerId, LoanStatus status);

    long countByIssueDateBetween(LocalDate start, LocalDate end);

    long countByActualReturnDateBetween(LocalDate start, LocalDate end);

    long countByStatus(LoanStatus status);

    @Query("select l from Loan l join fetch l.copy c join fetch c.book join fetch l.borrower where l.status = :status")
    List<Loan> findByStatus(@Param("status") LoanStatus status);

    long countByStatusAndDueDateBefore(LoanStatus status, LocalDate date);

    @Query("select l from Loan l join fetch l.copy c join fetch c.book join fetch l.borrower where l.status = :status and l.dueDate < :date order by l.dueDate asc")
    List<Loan> findOverdueLoans(@Param("status") LoanStatus status, @Param("date") LocalDate date);

    @Query("select l.copy.book.id as bookId, l.copy.book.title as title, l.copy.book.isbn as isbn, count(l) as loanCount " +
           "from Loan l group by l.copy.book.id, l.copy.book.title, l.copy.book.isbn order by count(l) desc")
    List<TopBorrowedBookProjection> findTopBorrowedBooks(Pageable pageable);

    @Query("select l from Loan l join fetch l.copy c join fetch c.book join fetch l.borrower order by l.createdAt desc")
    List<Loan> findRecentLoans(Pageable pageable);

    @Query("select l.borrower.id as borrowerId, count(l) as activeCount from Loan l where l.status = com.libtrack.circulation.LoanStatus.ACTIVE and l.borrower.id in :borrowerIds group by l.borrower.id")
    List<BorrowerLoanCount> countActiveLoansByBorrowerIds(@Param("borrowerIds") Collection<UUID> borrowerIds);
}
