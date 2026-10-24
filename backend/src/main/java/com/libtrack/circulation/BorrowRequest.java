package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.Book;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="borrow_request", indexes={@Index(name="ix_borrow_request_status_submitted",columnList="status,submitted_at"),@Index(name="ix_borrow_request_borrower_submitted",columnList="borrower_account_id,submitted_at"),@Index(name="ix_borrow_request_book",columnList="book_id")})
public class BorrowRequest {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="borrower_account_id",nullable=false,updatable=false) private UserAccount borrower;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="book_id",nullable=false,updatable=false) private Book book;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private BorrowRequestStatus status=BorrowRequestStatus.PENDING;
 @Column(name="submitted_at",nullable=false,updatable=false) private Instant submittedAt;
 @Column(name="decided_at") private Instant decidedAt;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="decided_by_account_id") private UserAccount decidedBy;
 @Column(name="decision_reason",length=1000) private String decisionReason;
 protected BorrowRequest(){}
 public BorrowRequest(UserAccount borrower,Book book,Instant submittedAt){this.borrower=borrower;this.book=book;this.submittedAt=submittedAt;this.status=BorrowRequestStatus.PENDING;}
 public void decide(RequestDecision decision,UserAccount actor,String reason,Instant now){if(status!=BorrowRequestStatus.PENDING)throw new IllegalStateException("Request is no longer pending.");status=decision==RequestDecision.APPROVE?BorrowRequestStatus.APPROVED:BorrowRequestStatus.REJECTED;decidedBy=actor;decidedAt=now;decisionReason=reason;}
 public void markIssued(){if(status!=BorrowRequestStatus.APPROVED)throw new IllegalStateException("Only approved requests may be issued.");status=BorrowRequestStatus.ISSUED;}
 public UUID getId(){return id;} public UserAccount getBorrower(){return borrower;} public Book getBook(){return book;} public BorrowRequestStatus getStatus(){return status;} public Instant getSubmittedAt(){return submittedAt;} public Instant getDecidedAt(){return decidedAt;} public UserAccount getDecidedBy(){return decidedBy;} public String getDecisionReason(){return decisionReason;}
}
