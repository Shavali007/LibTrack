package com.libtrack.circulation;

import com.libtrack.auth.AccountRole;
import com.libtrack.catalogue.CopyStatus;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class CirculationSpecifications {
    private CirculationSpecifications() {}

    static Specification<BorrowRequest> requests(BorrowRequestStatus status, UUID bookId, UUID borrowerId) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) p.add(cb.equal(root.get("status"), status));
            if (bookId != null) p.add(cb.equal(root.get("book").get("id"), bookId));
            if (borrowerId != null) p.add(cb.equal(root.get("borrower").get("id"), borrowerId));
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    static Specification<Loan> loans(LoanStatus status, LocalDate dueBefore, UUID borrowerId, boolean overdueOnly, LocalDate today) {
        return loans(status, dueBefore, borrowerId, overdueOnly, today, null, null, null, null, null, null, false);
    }

    static Specification<Loan> loans(
            LoanStatus status,
            LocalDate dueBefore,
            UUID borrowerId,
            boolean overdueOnly,
            LocalDate today,
            String search,
            AccountRole role,
            UUID bookId,
            LocalDate fromDate,
            LocalDate toDate,
            ReturnCondition condition,
            boolean historyOnly
    ) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();

            if (historyOnly) {
                p.add(cb.notEqual(root.get("status"), LoanStatus.ACTIVE));
            } else if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            } else {
                p.add(cb.equal(root.get("status"), LoanStatus.ACTIVE));
            }

            if (borrowerId != null) {
                p.add(cb.equal(root.get("borrower").get("id"), borrowerId));
            }

            if (dueBefore != null) {
                p.add(cb.lessThanOrEqualTo(root.get("dueDate"), dueBefore));
            }

            if (overdueOnly) {
                p.add(cb.equal(root.get("status"), LoanStatus.ACTIVE));
                p.add(cb.lessThan(root.get("dueDate"), today));
            }

            if (role != null) {
                p.add(cb.equal(root.get("borrower").get("role"), role));
            }

            if (bookId != null) {
                p.add(cb.equal(root.get("copy").get("book").get("id"), bookId));
            }

            if (fromDate != null) {
                Predicate retGte = cb.greaterThanOrEqualTo(root.get("actualReturnDate"), fromDate);
                Predicate issGte = cb.greaterThanOrEqualTo(root.get("issueDate"), fromDate);
                p.add(cb.or(retGte, issGte));
            }

            if (toDate != null) {
                Predicate retLte = cb.lessThanOrEqualTo(root.get("actualReturnDate"), toDate);
                Predicate issLte = cb.lessThanOrEqualTo(root.get("issueDate"), toDate);
                p.add(cb.or(retLte, issLte));
            }

            if (condition != null) {
                if (condition == ReturnCondition.LOST) {
                    p.add(cb.equal(root.get("status"), LoanStatus.LOST));
                } else if (condition == ReturnCondition.GOOD) {
                    p.add(cb.equal(root.get("status"), LoanStatus.RETURNED));
                    p.add(cb.notEqual(root.get("copy").get("status"), CopyStatus.DAMAGED));
                } else if (condition == ReturnCondition.DAMAGED) {
                    p.add(cb.equal(root.get("status"), LoanStatus.RETURNED));
                    p.add(cb.equal(root.get("copy").get("status"), CopyStatus.DAMAGED));
                }
            }

            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                Predicate title = cb.like(cb.lower(root.get("copy").get("book").get("title")), term);
                Predicate copyId = cb.like(cb.lower(root.get("copy").get("copyIdentifier")), term);
                Predicate email = cb.like(cb.lower(root.get("borrower").get("email")), term);
                Predicate name = cb.like(cb.lower(root.get("borrower").get("displayName")), term);
                p.add(cb.or(title, copyId, email, name));
            }

            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
