package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import com.libtrack.catalogue.BookCopy;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name="loan",indexes={@Index(name="ix_loan_borrower_issue",columnList="borrower_account_id,issue_date"),@Index(name="ix_loan_status_due",columnList="status,due_date")})
public class Loan {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="borrow_request_id",nullable=false,unique=true,updatable=false) private BorrowRequest request;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="book_copy_id",nullable=false,updatable=false) private BookCopy copy;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="borrower_account_id",nullable=false,updatable=false) private UserAccount borrower;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="issued_by_account_id",nullable=false,updatable=false) private UserAccount issuedBy;
 @Column(name="issue_date",nullable=false,updatable=false) private LocalDate issueDate;
 @Column(name="due_date",nullable=false) private LocalDate dueDate;
 @Column(name="actual_return_date") private LocalDate actualReturnDate;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private LoanStatus status=LoanStatus.ACTIVE;
 @Column(name="renewal_count",nullable=false) private short renewalCount;
 @Column(name="return_note",length=1000) private String returnNote;
 @Version @Column(nullable=false) private long version;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected Loan(){}
 public Loan(BorrowRequest request,BookCopy copy,UserAccount issuedBy,LocalDate issueDate,LocalDate dueDate){this.request=request;this.copy=copy;this.borrower=request.getBorrower();this.issuedBy=issuedBy;this.issueDate=issueDate;this.dueDate=dueDate;this.status=LoanStatus.ACTIVE;this.renewalCount=0;this.createdAt=Instant.now();}
 public LocalDate renew(LocalDate nextDueDate){if(status!=LoanStatus.ACTIVE||renewalCount>=1)throw new IllegalStateException("Loan is not eligible for renewal.");LocalDate previous=dueDate;dueDate=nextDueDate;renewalCount++;return previous;}
 public void returnCopy(ReturnCondition condition,LocalDate returned,String note){if(status!=LoanStatus.ACTIVE)throw new IllegalStateException("Loan is no longer active.");if(condition==ReturnCondition.LOST){status=LoanStatus.LOST;actualReturnDate=null;}else{status=LoanStatus.RETURNED;actualReturnDate=returned;}returnNote=note;}
 public UUID getId(){return id;} public BorrowRequest getRequest(){return request;} public BookCopy getCopy(){return copy;} public UserAccount getBorrower(){return borrower;} public UserAccount getIssuedBy(){return issuedBy;} public LocalDate getIssueDate(){return issueDate;} public LocalDate getDueDate(){return dueDate;} public LocalDate getActualReturnDate(){return actualReturnDate;} public LoanStatus getStatus(){return status;} public short getRenewalCount(){return renewalCount;} public String getReturnNote(){return returnNote;} public boolean isActive(){return status==LoanStatus.ACTIVE;}
}
