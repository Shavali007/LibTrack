package com.libtrack.circulation;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
final class CirculationSpecifications {
 private CirculationSpecifications(){}
 static Specification<BorrowRequest> requests(BorrowRequestStatus status,UUID bookId,UUID borrowerId){return (root,query,cb)->{List<Predicate> p=new ArrayList<>();if(status!=null)p.add(cb.equal(root.get("status"),status));if(bookId!=null)p.add(cb.equal(root.get("book").get("id"),bookId));if(borrowerId!=null)p.add(cb.equal(root.get("borrower").get("id"),borrowerId));return cb.and(p.toArray(Predicate[]::new));};}
 static Specification<Loan> loans(LoanStatus status,LocalDate dueBefore,UUID borrowerId,boolean overdueOnly,LocalDate today){return (root,query,cb)->{List<Predicate> p=new ArrayList<>();if(status!=null)p.add(cb.equal(root.get("status"),status));if(borrowerId!=null)p.add(cb.equal(root.get("borrower").get("id"),borrowerId));if(dueBefore!=null)p.add(cb.lessThanOrEqualTo(root.get("dueDate"),dueBefore));if(overdueOnly){p.add(cb.equal(root.get("status"),LoanStatus.ACTIVE));p.add(cb.lessThan(root.get("dueDate"),today));}return cb.and(p.toArray(Predicate[]::new));};}
}
