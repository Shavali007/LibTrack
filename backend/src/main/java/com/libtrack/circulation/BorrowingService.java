package com.libtrack.circulation;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.catalogue.PageResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BorrowingService {
 private static final int MAX_PAGE_SIZE=100;
 private final UserAccountRepository accounts;private final BookRepository books;private final BorrowRequestRepository requests;private final BorrowRequestEventRepository requestEvents;private final LoanRepository loans;private final LoanEventRepository loanEvents;private final CirculationCopyRepository copies;private final LibraryHolidayRepository holidays;private final DueDateService dueDates;private final Clock clock;
 public BorrowingService(UserAccountRepository accounts,BookRepository books,BorrowRequestRepository requests,BorrowRequestEventRepository requestEvents,LoanRepository loans,LoanEventRepository loanEvents,CirculationCopyRepository copies,LibraryHolidayRepository holidays,DueDateService dueDates,Clock clock){this.accounts=accounts;this.books=books;this.requests=requests;this.requestEvents=requestEvents;this.loans=loans;this.loanEvents=loanEvents;this.copies=copies;this.holidays=holidays;this.dueDates=dueDates;this.clock=clock;}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional
 public BorrowRequestResponse submit(UUID borrowerId,BorrowRequestCreate input){UserAccount borrower=member(borrowerId);Book book=books.findById(input.bookId()).filter(Book::isActive).orElseThrow(CirculationNotFoundException::new);ensureCirculating(book);Instant now=clock.instant();BorrowRequest request=requests.saveAndFlush(new BorrowRequest(borrower,book,now));requestEvents.save(new BorrowRequestEvent(request,BorrowRequestEventType.SUBMITTED,borrower,null,now));return requestResponse(request);}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<BorrowRequestResponse> mineRequests(UUID borrowerId,int page,int size){validPage(page,size);Page<BorrowRequest> result=requests.findByBorrower_IdOrderBySubmittedAtDesc(borrowerId,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::requestResponse).toList());}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<BorrowRequestResponse> queue(BorrowRequestStatus status,UUID bookId,int page,int size){validPage(page,size);Specification<BorrowRequest> filters=CirculationSpecifications.requests(status,bookId,null);Page<BorrowRequest> result=requests.findAll(filters,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"submittedAt")));return page(result,result.getContent().stream().map(this::requestResponse).toList());}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public BorrowRequestResponse decide(UUID requestId,UUID librarianId,RequestDecisionInput input){UserAccount librarian=librarian(librarianId);BorrowRequest request=requests.findByIdForUpdate(requestId).orElseThrow(CirculationNotFoundException::new);if(request.getBorrower().getId().equals(librarianId))throw new CirculationConflictException("A Librarian cannot decide their own request.");if(request.getStatus()!=BorrowRequestStatus.PENDING)throw new CirculationConflictException("Only pending requests can be decided.");String reason=clean(input.reason());Instant now=clock.instant();request.decide(input.decision(),librarian,reason,now);requestEvents.save(new BorrowRequestEvent(request,input.decision()==RequestDecision.APPROVE?BorrowRequestEventType.APPROVED:BorrowRequestEventType.REJECTED,librarian,reason,now));return requestResponse(request);}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LoanResponse issue(UUID requestId,UUID librarianId,IssueRequest input){UserAccount librarian=librarian(librarianId);BorrowRequest request=requests.findByIdForUpdate(requestId).orElseThrow(CirculationNotFoundException::new);if(request.getStatus()!=BorrowRequestStatus.APPROVED)throw new CirculationConflictException("Only approved requests can be issued.");UserAccount borrower=request.getBorrower();if(!borrower.isEnabled())throw new CirculationConflictException("The borrowing account is disabled.");Book book=request.getBook();if(!book.isActive())throw new CirculationConflictException("Inactive catalogue records cannot be issued.");ensureCirculating(book);BookCopy copy=copies.findByIdForUpdate(input.copyId()).orElseThrow(CirculationNotFoundException::new);if(!copy.getBook().getId().equals(book.getId()))throw new CirculationConflictException("The selected copy does not belong to the requested book.");if(copy.getStatus()!=CopyStatus.AVAILABLE)throw new CirculationConflictException("The selected physical copy is no longer available.");if(loans.existsByCopy_IdAndStatus(copy.getId(),LoanStatus.ACTIVE))throw new CirculationConflictException("The selected copy already has an active loan.");LocalDate issueDate=today();LocalDate dueDate=dueDates.initialDueDate(issueDate);copy.update(copy.getCopyIdentifier(),copy.getLocation(),CopyStatus.ON_LOAN);request.markIssued();Instant now=clock.instant();Loan loan=new Loan(request,copy,librarian,issueDate,dueDate);try{loan=loans.saveAndFlush(loan);}catch(DataIntegrityViolationException ex){throw new CirculationConflictException("The selected copy was issued by another transaction.");}requestEvents.save(new BorrowRequestEvent(request,BorrowRequestEventType.ISSUED,librarian,clean(input.note()),now));loanEvents.save(new LoanEvent(loan,LoanEventType.ISSUED,librarian,issueDate,null,dueDate,CopyStatus.ON_LOAN.name(),clean(input.note()),now));return loanResponse(loan);}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> mineCurrent(UUID borrowerId,int page,int size){validPage(page,size);Page<Loan> result=loans.findByBorrower_IdAndStatusOrderByDueDateAsc(borrowerId,LoanStatus.ACTIVE,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::loanResponse).toList());}
 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> mineHistory(UUID borrowerId,int page,int size){validPage(page,size);Page<Loan> result=loans.findByBorrower_IdAndStatusNotOrderByIssueDateDesc(borrowerId,LoanStatus.ACTIVE,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::loanResponse).toList());}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> librarianLoans(LoanStatus status,LocalDate dueBefore,boolean overdueOnly,int page,int size){validPage(page,size);LocalDate today=today();Specification<Loan> filters=CirculationSpecifications.loans(status,dueBefore,null,overdueOnly,today);Page<Loan> result=loans.findAll(filters,PageRequest.of(page,size,Sort.by(Sort.Direction.ASC,"dueDate")));return page(result,result.getContent().stream().map(this::loanResponse).toList());}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional
 public LoanResponse renew(UUID loanId,UUID borrowerId){UserAccount borrower=member(borrowerId);Loan loan=loans.findByIdForUpdate(loanId).orElseThrow(CirculationNotFoundException::new);if(!loan.getBorrower().getId().equals(borrowerId))throw new CirculationNotFoundException();if(!renewalEligible(loan))throw new CirculationConflictException("This loan is not eligible for an online renewal.");BookCopy copy=copies.findByIdForUpdate(loan.getCopy().getId()).orElseThrow(CirculationNotFoundException::new);if(copy.getStatus()!=CopyStatus.ON_LOAN)throw new CirculationConflictException("The copy status does not match the active loan.");LocalDate effective=today();LocalDate previous=loan.getDueDate();LocalDate next=dueDates.renewalDueDate(previous);loan.renew(next);loanEvents.save(new LoanEvent(loan,LoanEventType.RENEWED,borrower,effective,previous,next,copy.getStatus().name(),null,clock.instant()));return loanResponse(loan);}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LoanResponse recordReturn(UUID loanId,UUID librarianId,ReturnRequest input){UserAccount librarian=librarian(librarianId);Loan loan=loans.findByIdForUpdate(loanId).orElseThrow(CirculationNotFoundException::new);if(loan.getStatus()!=LoanStatus.ACTIVE)throw new CirculationConflictException("This loan is no longer active.");if(input.condition()!=ReturnCondition.GOOD&&(input.note()==null||input.note().isBlank()))throw new CirculationConflictException("A case note is required for lost or damaged material.");BookCopy copy=copies.findByIdForUpdate(loan.getCopy().getId()).orElseThrow(CirculationNotFoundException::new);if(copy.getStatus()!=CopyStatus.ON_LOAN)throw new CirculationConflictException("The copy status does not match the active loan.");LocalDate returned=today();CopyStatus nextStatus=switch(input.condition()){case GOOD->CopyStatus.AVAILABLE;case DAMAGED->CopyStatus.DAMAGED;case LOST->CopyStatus.LOST;};loan.returnCopy(input.condition(),returned,clean(input.note()));copy.update(copy.getCopyIdentifier(),copy.getLocation(),nextStatus);LoanEventType event=switch(input.condition()){case GOOD->LoanEventType.RETURNED_GOOD;case DAMAGED->LoanEventType.RETURNED_DAMAGED;case LOST->LoanEventType.REPORTED_LOST;};loanEvents.save(new LoanEvent(loan,event,librarian,returned,null,null,nextStatus.name(),clean(input.note()),clock.instant()));return loanResponse(loan);}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY','LIBRARIAN')") @Transactional(readOnly=true)
 public List<LibraryHolidayResponse> holidays(){return holidays.findAllByOrderByHolidayDateAsc().stream().map(this::holidayResponse).toList();}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LibraryHolidayResponse addHoliday(UUID actorId,LibraryHolidayInput input){UserAccount actor=librarian(actorId);String name=input.name().strip();if(holidays.findByHolidayDate(input.holidayDate()).isPresent())throw new CirculationConflictException("A holiday is already configured for that date.");try{return holidayResponse(holidays.saveAndFlush(new LibraryHoliday(input.holidayDate(),name,actor)));}catch(DataIntegrityViolationException ex){throw new CirculationConflictException("A holiday is already configured for that date.");}}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public void deleteHoliday(UUID id){if(!holidays.existsById(id))throw new CirculationNotFoundException();holidays.deleteById(id);}

 private BorrowRequestResponse requestResponse(BorrowRequest request){List<BorrowRequestEventResponse> history=requestEvents.history(request.getId()).stream().map(e->new BorrowRequestEventResponse(e.getEventType(),e.getActor().getEmail(),e.getOccurredAt(),e.getReason())).toList();return new BorrowRequestResponse(request.getId(),request.getBook().getId(),request.getBook().getTitle(),request.getBook().getCoverImageUrl(),request.getBorrower().getEmail(),request.getStatus(),request.getSubmittedAt(),request.getDecidedAt(),request.getDecisionReason(),history);}
 private LoanResponse loanResponse(Loan loan){Book book=loan.getCopy().getBook();boolean overdue=loan.getStatus()==LoanStatus.ACTIVE&&loan.getDueDate().isBefore(today());List<LoanEventResponse> history=loanEvents.history(loan.getId()).stream().map(e->new LoanEventResponse(e.getEventType(),e.getActor().getEmail(),e.getOccurredAt(),e.getEffectiveDate(),e.getPreviousDueDate(),e.getNewDueDate(),e.getCopyStatus(),e.getNote())).toList();return new LoanResponse(loan.getId(),loan.getRequest().getId(),book.getId(),book.getTitle(),book.getCoverImageUrl(),loan.getCopy().getCopyIdentifier(),loan.getBorrower().getEmail(),loan.getStatus(),loan.getIssueDate(),loan.getDueDate(),loan.getActualReturnDate(),loan.getRenewalCount(),overdue,renewalEligible(loan),loan.getReturnNote(),history);}
 private LibraryHolidayResponse holidayResponse(LibraryHoliday holiday){return new LibraryHolidayResponse(holiday.getId(),holiday.getHolidayDate(),holiday.getName(),holiday.getCreatedBy().getEmail(),holiday.getCreatedAt());}
 private boolean renewalEligible(Loan loan){return loan.getStatus()==LoanStatus.ACTIVE&&loan.getRenewalCount()<1&&loan.getCopy().getStatus()==CopyStatus.ON_LOAN&&loan.getCopy().getBook().getCirculationPolicy()==CirculationPolicy.STANDARD;}
 private UserAccount member(UUID id){UserAccount a=accounts.findByIdAndEnabledTrue(id).orElseThrow(CirculationNotFoundException::new);if(a.getRole()!=AccountRole.STUDENT&&a.getRole()!=AccountRole.FACULTY)throw new CirculationNotFoundException();return a;}
 private UserAccount librarian(UUID id){UserAccount a=accounts.findByIdAndEnabledTrue(id).orElseThrow(CirculationNotFoundException::new);if(a.getRole()!=AccountRole.LIBRARIAN)throw new CirculationNotFoundException();return a;}
 private static void ensureCirculating(Book book){if(book.getCirculationPolicy()!=CirculationPolicy.STANDARD)throw new CirculationConflictException("This material is not eligible for standard take-home circulation.");}
 private LocalDate today(){return LocalDate.now(clock);}
 private static String clean(String value){return value==null||value.isBlank()?null:value.strip();}
 private static void validPage(int page,int size){if(page<0)throw new IllegalArgumentException("Page must be zero or greater.");if(size<1||size>MAX_PAGE_SIZE)throw new IllegalArgumentException("Page size must be between 1 and 100.");}
 private static <T> PageResponse<T> page(Page<?> source,List<T> content){return new PageResponse<>(content,source.getNumber(),source.getSize(),source.getTotalElements(),source.getTotalPages());}
}

