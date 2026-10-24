package com.libtrack.circulation;
import java.time.Instant;
public record BorrowRequestEventResponse(BorrowRequestEventType eventType,String actorEmail,Instant occurredAt,String reason){}
