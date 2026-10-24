package com.libtrack.circulation;

import com.libtrack.auth.UserAccount;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name="library_holiday",uniqueConstraints=@UniqueConstraint(name="uq_library_holiday_date",columnNames="holiday_date"))
public class LibraryHoliday {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(name="holiday_date",nullable=false,updatable=false,unique=true) private LocalDate holidayDate;
 @Column(nullable=false,length=160) private String name;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="created_by_account_id",nullable=false,updatable=false) private UserAccount createdBy;
 @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
 protected LibraryHoliday(){}
 public LibraryHoliday(LocalDate holidayDate,String name,UserAccount actor){this.holidayDate=holidayDate;this.name=name;this.createdBy=actor;this.createdAt=Instant.now();}
 public UUID getId(){return id;}public LocalDate getHolidayDate(){return holidayDate;}public String getName(){return name;}public UserAccount getCreatedBy(){return createdBy;}public Instant getCreatedAt(){return createdAt;}
}
