package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name="loan_event",indexes=@Index(name="ix_loan_event_loan",columnList="loan_id,occurred_at"))
public class LoanEvent {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="loan_id",nullable=false,updatable=false) private Loan loan;
 @Enumerated(EnumType.STRING) @Column(name="event_type",nullable=false,length=24) private LoanEventType eventType;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="actor_account_id",nullable=false,updatable=false) private UserAccount actor;
 @Column(name="occurred_at",nullable=false,updatable=false) private Instant occurredAt;
 @Column(name="effective_date",nullable=false,updatable=false) private LocalDate effectiveDate;
 @Column(name="previous_due_date") private LocalDate previousDueDate;
 @Column(name="new_due_date") private LocalDate newDueDate;
 @Column(name="copy_status",length=20) private String copyStatus;
 @Column(length=1000) private String note;
 protected LoanEvent(){}
 public LoanEvent(Loan loan,LoanEventType type,UserAccount actor,LocalDate effectiveDate,LocalDate previousDueDate,LocalDate newDueDate,String copyStatus,String note,Instant occurredAt){this.loan=loan;this.eventType=type;this.actor=actor;this.effectiveDate=effectiveDate;this.previousDueDate=previousDueDate;this.newDueDate=newDueDate;this.copyStatus=copyStatus;this.note=note;this.occurredAt=occurredAt;}
 public LoanEventType getEventType(){return eventType;} public UserAccount getActor(){return actor;} public Instant getOccurredAt(){return occurredAt;} public LocalDate getEffectiveDate(){return effectiveDate;} public LocalDate getPreviousDueDate(){return previousDueDate;} public LocalDate getNewDueDate(){return newDueDate;} public String getCopyStatus(){return copyStatus;} public String getNote(){return note;}
}
