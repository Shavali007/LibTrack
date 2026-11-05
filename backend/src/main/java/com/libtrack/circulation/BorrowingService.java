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
import com.libtrack.fines.FinePolicy;
import com.libtrack.fines.FinePolicyService;
import com.libtrack.fines.FineService;
import com.libtrack.reservation.ReservationService;
import com.libtrack.settings.SystemSettingService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import com.libtrack.librarian.MonthlyCirculationOverview;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.notifications.NotificationService;

@Service
public class BorrowingService {
 private static final int MAX_PAGE_SIZE=100;
 private final UserAccountRepository accounts;private final BookRepository books;private final BorrowRequestRepository requests;private final BorrowRequestEventRepository requestEvents;private final LoanRepository loans;private final LoanEventRepository loanEvents;private final CirculationCopyRepository copies;private final LibraryHolidayRepository holidays;private final DueDateService dueDates;private final FineService fines;private final SystemSettingService settings;private final FinePolicyService finePolicyService;private final ReservationService reservations;private final AcademicSemesterService semesterService;private final UserSemesterRenewalRepository userSemesterRenewals;private final NotificationService notificationService;private final LoanReceiptService loanReceiptService;private final Clock clock;
 public BorrowingService(UserAccountRepository accounts,BookRepository books,BorrowRequestRepository requests,BorrowRequestEventRepository requestEvents,LoanRepository loans,LoanEventRepository loanEvents,CirculationCopyRepository copies,LibraryHolidayRepository holidays,DueDateService dueDates,FineService fines,SystemSettingService settings,FinePolicyService finePolicyService,ReservationService reservations,AcademicSemesterService semesterService,UserSemesterRenewalRepository userSemesterRenewals,NotificationService notificationService,LoanReceiptService loanReceiptService,Clock clock){this.accounts=accounts;this.books=books;this.requests=requests;this.requestEvents=requestEvents;this.loans=loans;this.loanEvents=loanEvents;this.copies=copies;this.holidays=holidays;this.dueDates=dueDates;this.fines=fines;this.settings=settings;this.finePolicyService=finePolicyService;this.reservations=reservations;this.semesterService=semesterService;this.userSemesterRenewals=userSemesterRenewals;this.notificationService=notificationService;this.loanReceiptService=loanReceiptService;this.clock=clock;}

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional
 public BorrowRequestResponse submit(UUID borrowerId,BorrowRequestCreate input){
  UserAccount borrower=accounts.findByIdForUpdate(borrowerId).orElseThrow(CirculationNotFoundException::new);
  if(borrower.getRole()!=AccountRole.STUDENT&&borrower.getRole()!=AccountRole.FACULTY)throw new CirculationNotFoundException();
  if(!borrower.isEnabled())throw new CirculationConflictException("The borrowing account is disabled.");
  Book book=books.findById(input.bookId()).filter(Book::isActive).orElseThrow(CirculationNotFoundException::new);
  ensureCirculating(book);
  validateBorrowerEligibility(borrower,book,true);
  Instant now=clock.instant();
  BorrowRequest request=requests.saveAndFlush(new BorrowRequest(borrower,book,now));
  requestEvents.save(new BorrowRequestEvent(request,BorrowRequestEventType.SUBMITTED,borrower,null,now));
  notificationService.sendMemberNotification(
      borrower.getId(),
      "Borrow Request Submitted",
      "Your request for \"" + book.getTitle() + "\" has been submitted.",
      "Your request is awaiting review by library administration.",
      "BORROW_REQUEST",
      "BORROW_REQUEST",
      request.getId(),
      "/workspace/my/requests",
      null
  );
  notificationService.sendRoleNotification(
      AccountRole.LIBRARIAN,
      "New Borrow Request",
      (borrower.getDisplayName() != null ? borrower.getDisplayName() : borrower.getEmail()) + " requested \"" + book.getTitle() + "\".",
      "A new borrow request requires review at the Circulation Desk.",
      "BORROW_REQUEST",
      "BORROW_REQUEST",
      request.getId(),
      "/workspace/librarian/requests",
      null
  );
  return requestResponse(request);
 }

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<BorrowRequestResponse> mineRequests(UUID borrowerId,int page,int size){validPage(page,size);Page<BorrowRequest> result=requests.findByBorrower_IdOrderBySubmittedAtDesc(borrowerId,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::requestResponse).toList());}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<BorrowRequestResponse> queue(BorrowRequestStatus status,UUID bookId,int page,int size){validPage(page,size);Specification<BorrowRequest> filters=CirculationSpecifications.requests(status,bookId,null);Page<BorrowRequest> result=requests.findAll(filters,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"submittedAt")));return page(result,result.getContent().stream().map(this::requestResponse).toList());}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public BorrowRequestResponse decide(UUID requestId,UUID librarianId,RequestDecisionInput input){
  UserAccount librarian=librarian(librarianId);
  BorrowRequest request=requests.findByIdForUpdate(requestId).orElseThrow(CirculationNotFoundException::new);
  if(request.getBorrower().getId().equals(librarianId))throw new CirculationConflictException("A Librarian cannot decide their own request.");
  if(request.getStatus()!=BorrowRequestStatus.PENDING)throw new CirculationConflictException("Only pending requests can be decided.");
  if(input.decision()==RequestDecision.APPROVE){
   UserAccount borrower=accounts.findByIdForUpdate(request.getBorrower().getId()).orElseThrow(CirculationNotFoundException::new);
   if(!borrower.isEnabled())throw new CirculationConflictException("The borrowing account is disabled.");
   validateBorrowerEligibility(borrower,request.getBook(),false);
  }
  String reason=clean(input.reason());
  Instant now=clock.instant();
  request.decide(input.decision(),librarian,reason,now);
  requestEvents.save(new BorrowRequestEvent(request,input.decision()==RequestDecision.APPROVE?BorrowRequestEventType.APPROVED:BorrowRequestEventType.REJECTED,librarian,reason,now));
  if(input.decision()==RequestDecision.APPROVE){
      notificationService.sendMemberNotification(
          request.getBorrower().getId(),
          "Borrow Request Approved",
          "Your request for \"" + request.getBook().getTitle() + "\" has been approved.",
          "Your borrow request has been approved. Please collect your book from the circulation desk.",
          "BORROW_REQUEST",
          "BORROW_REQUEST",
          request.getId(),
          "/workspace/my/requests",
          null
      );
  } else {
      notificationService.sendMemberNotification(
          request.getBorrower().getId(),
          "Borrow Request Rejected",
          "Your request for \"" + request.getBook().getTitle() + "\" was not approved.",
          reason != null && !reason.isBlank() ? "Librarian remarks: " + reason : "Your request could not be approved at this time.",
          "BORROW_REQUEST",
          "BORROW_REQUEST",
          request.getId(),
          "/workspace/my/requests",
          null
      );
  }
  if(input.decision()==RequestDecision.REJECT){reservations.handleBorrowRequestRejection(requestId);}
  return requestResponse(request);
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LoanResponse issue(UUID requestId,UUID librarianId,IssueRequest input){
  UserAccount librarian=librarian(librarianId);
  BorrowRequest request=requests.findByIdForUpdate(requestId).orElseThrow(CirculationNotFoundException::new);
  if(request.getStatus()!=BorrowRequestStatus.APPROVED)throw new CirculationConflictException("Only approved requests can be issued.");
  UserAccount borrower=accounts.findByIdForUpdate(request.getBorrower().getId()).orElseThrow(CirculationNotFoundException::new);
  if(!borrower.isEnabled())throw new CirculationConflictException("The borrowing account is disabled.");
  Book book=request.getBook();
  if(!book.isActive())throw new CirculationConflictException("Inactive catalogue records cannot be issued.");
  ensureCirculating(book);
  validateBorrowerEligibility(borrower,book,false);
  BookCopy copy=copies.findByIdForUpdate(input.copyId()).orElseThrow(CirculationNotFoundException::new);
  if(!copy.getBook().getId().equals(book.getId()))throw new CirculationConflictException("The selected copy does not belong to the requested book.");
  if(copy.getStatus()!=CopyStatus.AVAILABLE)throw new CirculationConflictException("The selected physical copy is no longer available.");
  if(loans.existsByCopy_IdAndStatus(copy.getId(),LoanStatus.ACTIVE))throw new CirculationConflictException("The selected copy already has an active loan.");
  FinePolicy finePolicy=finePolicyService.currentPolicy();
  int loanDays=finePolicy.loanPeriodDays();
  LocalDate issueDate=today();
  LocalDate dueDate=dueDates.calculateDueDate(issueDate,loanDays);
  var dailyFineRate=finePolicy.dailyRate();
  var maxFineAmount=finePolicy.maximumFine();
  int gracePeriod=finePolicy.gracePeriodDays();
  copy.update(copy.getCopyIdentifier(),copy.getLocation(),CopyStatus.ON_LOAN);
  copies.saveAndFlush(copy);
  request.markIssued();
  Instant now=clock.instant();
  Loan loan=new Loan(request,copy,librarian,issueDate,dueDate,dailyFineRate,maxFineAmount,gracePeriod);
  try{loan=loans.saveAndFlush(loan);}catch(DataIntegrityViolationException ex){throw new CirculationConflictException("The selected copy was issued by another transaction.");}
  loanReceiptService.getOrCreateReceipt(loan,librarian);
  requestEvents.save(new BorrowRequestEvent(request,BorrowRequestEventType.ISSUED,librarian,clean(input.note()),now));
  loanEvents.save(new LoanEvent(loan,LoanEventType.ISSUED,librarian,issueDate,null,dueDate,CopyStatus.ON_LOAN.name(),clean(input.note()),now));
  reservations.markCompletedForBorrowRequest(requestId);
  notificationService.sendMemberNotification(
      borrower.getId(),
      "Book Issued",
      "\"" + book.getTitle() + "\" has been issued to you. Due on " + dueDate + ".",
      "Your borrowed book is active. Due date: " + dueDate + ". Please return or renew on time.",
      "LOAN",
      "LOAN",
      loan.getId(),
      "/workspace/my/borrowings",
      null
  );
  return loanResponse(loan);
 }

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> mineCurrent(UUID borrowerId,int page,int size){validPage(page,size);Page<Loan> result=loans.findByBorrower_IdAndStatusOrderByDueDateAsc(borrowerId,LoanStatus.ACTIVE,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::loanResponse).toList());}
 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> mineHistory(UUID borrowerId,int page,int size){validPage(page,size);Page<Loan> result=loans.findByBorrower_IdAndStatusNotOrderByIssueDateDesc(borrowerId,LoanStatus.ACTIVE,PageRequest.of(page,size));return page(result,result.getContent().stream().map(this::loanResponse).toList());}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> librarianLoans(
     LoanStatus status,
     LocalDate dueBefore,
     boolean overdueOnly,
     String search,
     AccountRole role,
     UUID bookId,
     LocalDate fromDate,
     LocalDate toDate,
     ReturnCondition condition,
     boolean historyOnly,
     int page,
     int size
 ) {
   validPage(page, size);
   LocalDate today = today();
   Specification<Loan> filters = CirculationSpecifications.loans(
       status, dueBefore, null, overdueOnly, today, search, role, bookId, fromDate, toDate, condition, historyOnly
   );
   Sort sort = historyOnly
       ? Sort.by(Sort.Direction.DESC, "createdAt")
       : Sort.by(Sort.Direction.ASC, "dueDate");
   Page<Loan> result = loans.findAll(filters, PageRequest.of(page, size, sort));
   return page(result, result.getContent().stream().map(this::loanResponse).toList());
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<LoanResponse> librarianLoans(LoanStatus status, LocalDate dueBefore, boolean overdueOnly, int page, int size) {
   return librarianLoans(status, dueBefore, overdueOnly, null, null, null, null, null, null, false, page, size);
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public CirculationSummaryResponse getCirculationSummary() {
   LocalDate today = today();
   LocalDate monthStart = today.withDayOfMonth(1);
   LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

   long activeLoans = loans.countByStatus(LoanStatus.ACTIVE);
   long totalTransactions = loans.count();
   long totalReturnsThisMonth = loans.countByActualReturnDateBetween(monthStart, monthEnd);
   long damagedCopies = copies.countByStatus(CopyStatus.DAMAGED);
   long lostCopies = copies.countByStatus(CopyStatus.LOST);

   long historyTotalCount = loans.countByStatusNot(LoanStatus.ACTIVE);
   long historyLostCount = loans.countHistoryLost();
   long historyDamagedCount = loans.countHistoryDamaged();
   long historyGoodCount = loans.countHistoryGood();

   return new CirculationSummaryResponse(
       activeLoans,
       totalTransactions,
       totalReturnsThisMonth,
       damagedCopies,
       lostCopies,
       historyTotalCount,
       historyGoodCount,
       historyDamagedCount,
       historyLostCount
   );
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public PageResponse<LostDamagedCopyItem> getLostAndDamagedCopies(String condition, String search, int page, int size) {
   validPage(page, size);
   List<CopyStatus> statuses = new ArrayList<>();
   if (condition != null && !condition.isBlank()) {
     String c = condition.trim().toUpperCase();
     if ("LOST".equals(c)) {
       statuses.add(CopyStatus.LOST);
     } else if ("DAMAGED".equals(c)) {
       statuses.add(CopyStatus.DAMAGED);
     }
   }
   if (statuses.isEmpty()) {
     statuses.add(CopyStatus.LOST);
     statuses.add(CopyStatus.DAMAGED);
   }

   List<BookCopy> matchingCopies = copies.findByStatusInOrderByUpdatedAtDesc(statuses);
   String cleanSearch = search != null ? search.trim().toLowerCase() : null;
   if (cleanSearch != null && !cleanSearch.isBlank()) {
     matchingCopies = matchingCopies.stream().filter(c -> {
       boolean titleMatches = c.getBook() != null && c.getBook().getTitle().toLowerCase().contains(cleanSearch);
       boolean copyMatches = c.getCopyIdentifier().toLowerCase().contains(cleanSearch);
       return titleMatches || copyMatches;
     }).toList();
   }

   List<LostDamagedCopyItem> items = new ArrayList<>();
   for (BookCopy c : matchingCopies) {
     Loan lastLoan = loans.findTopByCopy_IdOrderByCreatedAtDesc(c.getId()).orElse(null);
     String borrowerName = null;
     String borrowerEmail = null;
     String borrowerRole = null;
     LocalDate reportedDate = null;
     String caseNote = null;

     if (lastLoan != null) {
       UserAccount borrower = lastLoan.getBorrower();
       borrowerName = borrower.getDisplayName() != null && !borrower.getDisplayName().isBlank()
           ? borrower.getDisplayName()
           : (borrower.getInstitutionalId() != null ? borrower.getInstitutionalId() : borrower.getEmail().split("@")[0]);
       borrowerEmail = borrower.getEmail();
       borrowerRole = borrower.getRole() != null ? borrower.getRole().name() : null;
       reportedDate = lastLoan.getActualReturnDate() != null ? lastLoan.getActualReturnDate() : lastLoan.getIssueDate();
       caseNote = lastLoan.getReturnNote();
     }
     if (reportedDate == null && c.getUpdatedAt() != null) {
       reportedDate = LocalDate.ofInstant(c.getUpdatedAt(), clock.getZone());
     }

     String itemCondition = c.getStatus() == CopyStatus.LOST ? "LOST" : "DAMAGED";
     items.add(new LostDamagedCopyItem(
         c.getId(),
         c.getBook().getId(),
         c.getBook().getTitle(),
         c.getBook().getCoverImageUrl(),
         c.getCopyIdentifier(),
         c.getLocation(),
         c.getStatus().name(),
         itemCondition,
         borrowerName,
         borrowerEmail,
         borrowerRole,
         reportedDate,
         caseNote
     ));
   }

   int totalElements = items.size();
   int fromIndex = Math.min(page * size, totalElements);
   int toIndex = Math.min(fromIndex + size, totalElements);
   List<LostDamagedCopyItem> paged = items.subList(fromIndex, toIndex);
   int totalPages = (int) Math.ceil((double) totalElements / size);

   return new PageResponse<>(paged, page, size, totalElements, totalPages);
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional(readOnly=true)
 public CirculationStatsResponse getCirculationStats() {
   LocalDate today = today();
   LocalDate monthStart = today.withDayOfMonth(1);
   LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

   long activeLoans = loans.countByStatus(LoanStatus.ACTIVE);
   long totalReturnsThisMonth = loans.countByActualReturnDateBetween(monthStart, monthEnd);
   long overdueLoans = loans.countByStatusAndDueDateBefore(LoanStatus.ACTIVE, today);
   long damagedCopies = copies.countByStatus(CopyStatus.DAMAGED);
   long lostCopies = copies.countByStatus(CopyStatus.LOST);

   long goodReturns = loans.countHistoryGood();
   long damagedReturns = loans.countHistoryDamaged();
   long lostReports = loans.countHistoryLost();

   YearMonth current = YearMonth.from(today);
   List<MonthlyCirculationOverview> activityOverTime = new ArrayList<>();
   for (int i = 5; i >= 0; i--) {
     YearMonth targetMonth = current.minusMonths(i);
     LocalDate start = targetMonth.atDay(1);
     LocalDate end = targetMonth.atEndOfMonth();
     long issued = loans.countByIssueDateBetween(start, end);
     long returned = loans.countByActualReturnDateBetween(start, end);
     String monthName = targetMonth.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
     activityOverTime.add(new MonthlyCirculationOverview(monthName, targetMonth.getYear(), issued, returned));
   }

   long studentActive = loans.countByBorrower_RoleAndStatus(AccountRole.STUDENT, LoanStatus.ACTIVE);
   long facultyActive = loans.countByBorrower_RoleAndStatus(AccountRole.FACULTY, LoanStatus.ACTIVE);
   long studentTotal = loans.countByBorrower_Role(AccountRole.STUDENT);
   long facultyTotal = loans.countByBorrower_Role(AccountRole.FACULTY);

   return new CirculationStatsResponse(
       activeLoans,
       totalReturnsThisMonth,
       goodReturns,
       damagedCopies,
       lostCopies,
       overdueLoans,
       activityOverTime,
       new CirculationStatsResponse.ReturnConditionDistribution(goodReturns, damagedReturns, lostReports),
       new CirculationStatsResponse.MemberCirculationBreakdown(studentActive, facultyActive, studentTotal, facultyTotal)
   );
 }


 @PreAuthorize("hasAnyRole('STUDENT','FACULTY')") @Transactional
 public LoanResponse renew(UUID loanId,UUID borrowerId){
  UserAccount borrower=accounts.findByIdForUpdate(borrowerId).orElseThrow(CirculationNotFoundException::new);
  if(borrower.getRole()!=AccountRole.STUDENT&&borrower.getRole()!=AccountRole.FACULTY)throw new CirculationNotFoundException();
  if(!borrower.isEnabled())throw new CirculationConflictException("The borrowing account is disabled.");

  AcademicSemester semester=semesterService.getCurrentSemester();
  if(userSemesterRenewals.existsByUser_IdAndSemesterCode(borrowerId,semester.getSemesterCode())){
   throw new CirculationConflictException("You have already used your renewal allowance of 1 renewal for the current semester ("+semester.getName()+").");
  }

  Loan loan=loans.findByIdForUpdate(loanId).orElseThrow(CirculationNotFoundException::new);
  if(!loan.getBorrower().getId().equals(borrowerId))throw new CirculationNotFoundException();
  if(loan.getDueDate().isBefore(today())){
   throw new CirculationConflictException("Renewal is unavailable because this loan has passed its due date. Please return the book to the circulation desk.");
  }
  if(!renewalEligible(loan,borrowerId,semester.getSemesterCode()))throw new CirculationConflictException("This loan is not eligible for an online renewal.");
  BookCopy copy=copies.findByIdForUpdate(loan.getCopy().getId()).orElseThrow(CirculationNotFoundException::new);
  if(copy.getStatus()!=CopyStatus.ON_LOAN)throw new CirculationConflictException("The copy status does not match the active loan.");
  LocalDate effective=today();
  LocalDate previous=loan.getDueDate();
  int renewalDays=parseInt(settings.getSetting("loan.renewal.extension.days","21"),21);
  if(renewalDays<=0)renewalDays=21;
  LocalDate next=dueDates.calculateDueDate(previous,renewalDays);
  loan.renew(next);
  loanEvents.save(new LoanEvent(loan,LoanEventType.RENEWED,borrower,effective,previous,next,copy.getStatus().name(),null,clock.instant()));
  userSemesterRenewals.saveAndFlush(new UserSemesterRenewal(borrower,semester.getSemesterCode(),loan,clock.instant()));
  notificationService.sendMemberNotification(
      borrowerId,
      "Loan Renewed",
      "\"" + loan.getCopy().getBook().getTitle() + "\" has been renewed. Due on " + next + ".",
      "Your loan was successfully extended to " + next + ".",
      "LOAN",
      "LOAN",
      loan.getId(),
      "/workspace/my/borrowings",
      null
  );
  return loanResponse(loan);
 }

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LoanResponse recordReturn(UUID loanId,UUID librarianId,ReturnRequest input){UserAccount librarian=librarian(librarianId);Loan loan=loans.findByIdForUpdate(loanId).orElseThrow(CirculationNotFoundException::new);if(loan.getStatus()!=LoanStatus.ACTIVE)throw new CirculationConflictException("This loan is no longer active.");if(input.condition()!=ReturnCondition.GOOD&&(input.note()==null||input.note().isBlank()))throw new CirculationConflictException("A case note is required for lost or damaged material.");BookCopy copy=copies.findByIdForUpdate(loan.getCopy().getId()).orElseThrow(CirculationNotFoundException::new);if(copy.getStatus()!=CopyStatus.ON_LOAN)throw new CirculationConflictException("The copy status does not match the active loan.");LocalDate returned=today();CopyStatus nextStatus=switch(input.condition()){case GOOD->CopyStatus.AVAILABLE;case DAMAGED->CopyStatus.DAMAGED;case LOST->CopyStatus.LOST;};loan.returnCopy(input.condition(),returned,clean(input.note()));copy.update(copy.getCopyIdentifier(),copy.getLocation(),nextStatus);copies.saveAndFlush(copy);if(nextStatus==CopyStatus.AVAILABLE){reservations.processQueueForCopy(copy);}fines.finalizeFineOnReturn(loan);LoanEventType event=switch(input.condition()){case GOOD->LoanEventType.RETURNED_GOOD;case DAMAGED->LoanEventType.RETURNED_DAMAGED;case LOST->LoanEventType.REPORTED_LOST;};loanEvents.save(new LoanEvent(loan,event,librarian,returned,null,null,nextStatus.name(),clean(input.note()),clock.instant()));
notificationService.sendMemberNotification(
    loan.getBorrower().getId(),
    "Book Returned",
    "Your return for \"" + loan.getCopy().getBook().getTitle() + "\" has been recorded.",
    "The physical book was successfully received back at the library.",
    "LOAN",
    "LOAN",
    loan.getId(),
    "/workspace/my/borrowings",
    null
);
if (input.condition() == ReturnCondition.DAMAGED) {
    notificationService.sendRoleNotification(
        AccountRole.LIBRARIAN,
        "Damaged Book Report",
        "A copy of \"" + loan.getCopy().getBook().getTitle() + "\" was returned DAMAGED by " + (loan.getBorrower().getDisplayName() != null ? loan.getBorrower().getDisplayName() : loan.getBorrower().getEmail()) + ".",
        "Case note: " + clean(input.note()),
        "CIRCULATION",
        "LOAN",
        loan.getId(),
        "/workspace/librarian/circulation",
        null
    );
} else if (input.condition() == ReturnCondition.LOST) {
    notificationService.sendRoleNotification(
        AccountRole.LIBRARIAN,
        "Lost Book Report",
        "A copy of \"" + loan.getCopy().getBook().getTitle() + "\" was reported LOST for borrower " + (loan.getBorrower().getDisplayName() != null ? loan.getBorrower().getDisplayName() : loan.getBorrower().getEmail()) + ".",
        "Case note: " + clean(input.note()),
        "CIRCULATION",
        "LOAN",
        loan.getId(),
        "/workspace/librarian/circulation",
        null
    );
}
return loanResponse(loan);}

 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LoanResponse updateLoanCondition(UUID loanId, UUID librarianId, UpdateConditionRequest input) {
   UserAccount librarian = librarian(librarianId);
   Loan loan = loans.findByIdForUpdate(loanId).orElseThrow(CirculationNotFoundException::new);
   if (loan.getStatus() == LoanStatus.ACTIVE) {
     throw new CirculationConflictException("Active loans cannot have their condition updated. Please process a return.");
   }
   if (input == null || input.condition() == null) {
     throw new IllegalArgumentException("Condition must not be null.");
   }
   if (input.reason() == null || input.reason().isBlank()) {
     throw new CirculationConflictException("A case note / reason is required when modifying a circulation condition.");
   }
   BookCopy copy = copies.findByIdForUpdate(loan.getCopy().getId()).orElseThrow(CirculationNotFoundException::new);

   if (input.condition() == ReturnCondition.GOOD && copy.getStatus() == CopyStatus.ON_LOAN) {
     throw new CirculationConflictException("The copy is currently checked out on another active loan and cannot be marked Available.");
   }

   LocalDate effectiveDate = today();
   String cleanNote = clean(input.reason());
   loan.updateCondition(input.condition(), effectiveDate, cleanNote);

   CopyStatus nextCopyStatus = switch (input.condition()) {
     case GOOD -> CopyStatus.AVAILABLE;
     case DAMAGED -> CopyStatus.DAMAGED;
     case LOST -> CopyStatus.LOST;
   };
   copy.update(copy.getCopyIdentifier(), copy.getLocation(), nextCopyStatus);
   copies.saveAndFlush(copy);
   loans.saveAndFlush(loan);

   if (nextCopyStatus == CopyStatus.AVAILABLE) {
     reservations.processQueueForCopy(copy);
   }

   LoanEventType eventType = switch (input.condition()) {
     case GOOD -> LoanEventType.RETURNED_GOOD;
     case DAMAGED -> LoanEventType.RETURNED_DAMAGED;
     case LOST -> LoanEventType.REPORTED_LOST;
   };
   loanEvents.save(new LoanEvent(
       loan,
       eventType,
       librarian,
       effectiveDate,
       null,
       null,
       nextCopyStatus.name(),
       "[Condition updated to " + input.condition() + "]: " + cleanNote,
       clock.instant()
   ));

   return loanResponse(loan);
 }

 @PreAuthorize("hasAnyRole('STUDENT','FACULTY','LIBRARIAN')") @Transactional(readOnly=true)
 public List<LibraryHolidayResponse> holidays(){return holidays.findAllByOrderByFromDateAsc().stream().map(LibraryHolidayResponse::from).toList();}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LibraryHolidayResponse addHoliday(UUID actorId,LibraryHolidayInput input){UserAccount actor=librarian(actorId);String name=input.name().strip();LocalDate fromDate=input.resolveFromDate();LocalDate toDate=input.resolveToDate();if(fromDate==null||toDate==null)throw new IllegalArgumentException("Holiday From Date and To Date are mandatory.");if(toDate.isBefore(fromDate))throw new IllegalArgumentException("Holiday To Date cannot be earlier than From Date.");List<LibraryHoliday> overlapping=holidays.findOverlappingHolidays(fromDate,toDate);if(!overlapping.isEmpty()){LibraryHoliday first=overlapping.get(0);throw new CirculationConflictException("The holiday date range ("+fromDate+" to "+toDate+") overlaps with existing holiday '"+first.getName()+"' ("+first.getFromDate()+" to "+first.getToDate()+").");}try{return LibraryHolidayResponse.from(holidays.saveAndFlush(new LibraryHoliday(fromDate,toDate,name,actor)));}catch(DataIntegrityViolationException ex){throw new CirculationConflictException("A holiday is already configured for that date range.");}}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public void deleteHoliday(UUID id){if(!holidays.existsById(id))throw new CirculationNotFoundException();holidays.deleteById(id);}
 @PreAuthorize("hasRole('LIBRARIAN')") @Transactional
 public LibraryHolidayResponse updateHoliday(UUID id,UUID actorId,LibraryHolidayInput input){librarian(actorId);LibraryHoliday holiday=holidays.findById(id).orElseThrow(CirculationNotFoundException::new);String name=input.name().strip();LocalDate fromDate=input.resolveFromDate();LocalDate toDate=input.resolveToDate();if(fromDate==null||toDate==null)throw new IllegalArgumentException("Holiday From Date and To Date are mandatory.");if(toDate.isBefore(fromDate))throw new IllegalArgumentException("Holiday To Date cannot be earlier than From Date.");List<LibraryHoliday> overlapping=holidays.findOverlappingHolidaysExcludingId(id,fromDate,toDate);if(!overlapping.isEmpty()){LibraryHoliday first=overlapping.get(0);throw new CirculationConflictException("The holiday date range ("+fromDate+" to "+toDate+") overlaps with existing holiday '"+first.getName()+"' ("+first.getFromDate()+" to "+first.getToDate()+").");}holiday.update(fromDate,toDate,name);try{return LibraryHolidayResponse.from(holidays.saveAndFlush(holiday));}catch(DataIntegrityViolationException ex){throw new CirculationConflictException("A holiday is already configured for that date range.");}}

 private BorrowRequestResponse requestResponse(BorrowRequest request){List<BorrowRequestEventResponse> history=requestEvents.history(request.getId()).stream().map(e->new BorrowRequestEventResponse(e.getEventType(),e.getActor().getEmail(),e.getOccurredAt(),e.getReason())).toList();return new BorrowRequestResponse(request.getId(),request.getBook().getId(),request.getBook().getTitle(),request.getBook().getCoverImageUrl(),request.getBorrower().getEmail(),request.getBorrower().getInstitutionalId(),request.getBorrower().getRole()!=null?request.getBorrower().getRole().name():null,request.getStatus(),request.getSubmittedAt(),request.getDecidedAt(),request.getDecisionReason(),history,request.getBorrower().getDisplayName());}
 private LoanResponse loanResponse(Loan loan) {
  Book book = loan.getCopy().getBook();
  boolean overdue = loan.getStatus() == LoanStatus.ACTIVE && loan.getDueDate().isBefore(today());
  List<LoanEventResponse> history = loanEvents.history(loan.getId()).stream()
      .map(e -> new LoanEventResponse(
          e.getEventType(),
          e.getActor().getEmail(),
          e.getOccurredAt(),
          (e.getEventType() == LoanEventType.ISSUED && e.getOccurredAt() != null)
              ? LocalDate.ofInstant(e.getOccurredAt(), clock.getZone())
              : e.getEffectiveDate(),
          e.getPreviousDueDate(),
          e.getNewDueDate(),
          e.getCopyStatus(),
          e.getNote()
      )).toList();
  AcademicSemester semester = semesterService.getCurrentSemester();
  boolean eligible = renewalEligible(loan, loan.getBorrower().getId(), semester.getSemesterCode());

  String borrowerRole = loan.getBorrower() != null && loan.getBorrower().getRole() != null
      ? loan.getBorrower().getRole().name()
      : null;

  String returnCondition = null;
  String processedByEmail = null;
  if (loan.getStatus() != LoanStatus.ACTIVE) {
    List<LoanEvent> evts = loanEvents.history(loan.getId());
    for (int i = evts.size() - 1; i >= 0; i--) {
      LoanEvent e = evts.get(i);
      if (e.getEventType() == LoanEventType.RETURNED_GOOD) {
        returnCondition = "GOOD";
        processedByEmail = e.getActor() != null ? e.getActor().getEmail() : null;
        break;
      } else if (e.getEventType() == LoanEventType.RETURNED_DAMAGED) {
        returnCondition = "DAMAGED";
        processedByEmail = e.getActor() != null ? e.getActor().getEmail() : null;
        break;
      } else if (e.getEventType() == LoanEventType.REPORTED_LOST) {
        returnCondition = "LOST";
        processedByEmail = e.getActor() != null ? e.getActor().getEmail() : null;
        break;
      }
    }
    if (returnCondition == null) {
      if (loan.getStatus() == LoanStatus.LOST) {
        returnCondition = "LOST";
      } else if (loan.getCopy() != null && loan.getCopy().getStatus() == CopyStatus.DAMAGED) {
        returnCondition = "DAMAGED";
      } else {
        returnCondition = "GOOD";
      }
    }
  }

  Long daysLeft = ChronoUnit.DAYS.between(today(), loan.getDueDate());
  String inventoryStatus = loan.getCopy() != null && loan.getCopy().getStatus() != null
      ? loan.getCopy().getStatus().name()
      : null;

  LocalDate effectiveIssueDate = loan.getCreatedAt() != null
      ? LocalDate.ofInstant(loan.getCreatedAt(), clock.getZone())
      : loan.getIssueDate();

  return new LoanResponse(
      loan.getId(),
      loan.getRequest().getId(),
      book.getId(),
      book.getTitle(),
      book.getCoverImageUrl(),
      loan.getCopy().getCopyIdentifier(),
      loan.getBorrower().getEmail(),
      loan.getStatus(),
      effectiveIssueDate,
      loan.getDueDate(),
      loan.getActualReturnDate(),
      loan.getRenewalCount(),
      overdue,
      eligible,
      loan.getReturnNote(),
      history,
      loan.getBorrower().getDisplayName(),
      borrowerRole,
      returnCondition,
      processedByEmail,
      daysLeft,
      inventoryStatus
  );
 }
 private LibraryHolidayResponse holidayResponse(LibraryHoliday holiday){return LibraryHolidayResponse.from(holiday);}
 private boolean renewalEligible(Loan loan,UUID borrowerId,String semesterCode){return loan.getStatus()==LoanStatus.ACTIVE&&loan.getRenewalCount()<1&&loan.getCopy().getStatus()==CopyStatus.ON_LOAN&&loan.getCopy().getBook().getCirculationPolicy()==CirculationPolicy.STANDARD&&!loan.getDueDate().isBefore(today())&&!userSemesterRenewals.existsByUser_IdAndSemesterCode(borrowerId,semesterCode);}
 private UserAccount member(UUID id){UserAccount a=accounts.findByIdAndEnabledTrue(id).orElseThrow(CirculationNotFoundException::new);if(a.getRole()!=AccountRole.STUDENT&&a.getRole()!=AccountRole.FACULTY)throw new CirculationNotFoundException();return a;}
 private UserAccount librarian(UUID id){UserAccount a=accounts.findByIdAndEnabledTrue(id).orElseThrow(CirculationNotFoundException::new);if(a.getRole()!=AccountRole.LIBRARIAN)throw new CirculationNotFoundException();return a;}
 private static void ensureCirculating(Book book){if(book.getCirculationPolicy()!=CirculationPolicy.STANDARD)throw new CirculationConflictException("This material is not eligible for standard take-home circulation.");}
 private LocalDate today(){return LocalDate.now(clock);}
 private static String clean(String value){return value==null||value.isBlank()?null:value.strip();}
 private static void validPage(int page,int size){if(page<0)throw new IllegalArgumentException("Page must be zero or greater.");if(size<1||size>MAX_PAGE_SIZE)throw new IllegalArgumentException("Page size must be between 1 and 100.");}
 private static <T> PageResponse<T> page(Page<?> source,List<T> content){return new PageResponse<>(content,source.getNumber(),source.getSize(),source.getTotalElements(),source.getTotalPages());}
 private static int parseInt(String value,int fallback){if(value==null)return fallback;try{return Integer.parseInt(value.trim());}catch(Exception e){return fallback;}}

 private int getBorrowingLimit(UserAccount account) {
  if (account.getRole() == AccountRole.FACULTY) {
   return parseInt(settings.getSetting("loan.max.active.faculty", "5"), 5);
  }
  return parseInt(settings.getSetting("loan.max.active.student", "5"), 5);
 }

 private void validateBorrowerEligibility(UserAccount borrower, Book book, boolean isOwnSubmission) {
  if (loans.existsByBorrower_IdAndCopy_Book_Id(borrower.getId(), book.getId())) {
   String msg = isOwnSubmission
     ? "You have already borrowed this book previously. Duplicate borrowing of the same book is not permitted."
     : "The borrower has already borrowed this book previously. Duplicate borrowing of the same book is not permitted.";
   throw new CirculationConflictException(msg);
  }

  if (isOwnSubmission && (requests.existsByBorrower_IdAndBook_IdAndStatus(borrower.getId(), book.getId(), BorrowRequestStatus.PENDING)
    || requests.existsByBorrower_IdAndBook_IdAndStatus(borrower.getId(), book.getId(), BorrowRequestStatus.APPROVED))) {
   throw new CirculationConflictException("You already have an active borrowing request for this book.");
  }

  long activeLoans = loans.countByBorrower_IdAndStatus(borrower.getId(), LoanStatus.ACTIVE);
  int maxLimit = getBorrowingLimit(borrower);
  if (activeLoans >= maxLimit) {
   String msg = isOwnSubmission
     ? "You have reached the maximum borrowing limit of " + maxLimit + " active borrowed books."
     : "The borrower has reached the maximum borrowing limit of " + maxLimit + " active borrowed books.";
   throw new CirculationConflictException(msg);
  }
 }
}
