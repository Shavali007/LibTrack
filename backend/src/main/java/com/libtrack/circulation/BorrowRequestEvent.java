package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="borrow_request_event",indexes=@Index(name="ix_borrow_request_event_request",columnList="borrow_request_id,occurred_at"))
public class BorrowRequestEvent {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="borrow_request_id",nullable=false,updatable=false) private BorrowRequest request;
 @Enumerated(EnumType.STRING) @Column(name="event_type",nullable=false,length=20) private BorrowRequestEventType eventType;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="actor_account_id",nullable=false,updatable=false) private UserAccount actor;
 @Column(name="occurred_at",nullable=false,updatable=false) private Instant occurredAt;
 @Column(length=1000) private String reason;
 protected BorrowRequestEvent(){}
 public BorrowRequestEvent(BorrowRequest request,BorrowRequestEventType type,UserAccount actor,String reason,Instant occurredAt){this.request=request;this.eventType=type;this.actor=actor;this.reason=reason;this.occurredAt=occurredAt;}
 public BorrowRequestEventType getEventType(){return eventType;} public UserAccount getActor(){return actor;} public String getReason(){return reason;} public Instant getOccurredAt(){return occurredAt;}
}
