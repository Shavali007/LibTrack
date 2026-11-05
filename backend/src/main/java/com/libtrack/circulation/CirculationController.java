package com.libtrack.circulation;

import com.libtrack.auth.AccountUserDetails;
import com.libtrack.catalogue.PageResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class CirculationController {
 private final BorrowingService borrowing;
 private final LoanReceiptService loanReceiptService;
 public CirculationController(BorrowingService borrowing, LoanReceiptService loanReceiptService){
     this.borrowing=borrowing;
     this.loanReceiptService=loanReceiptService;
 }
 private static UUID accountId(Authentication authentication){return ((AccountUserDetails)authentication.getPrincipal()).getId();}
 @PostMapping("/borrow-requests") public ResponseEntity<BorrowRequestResponse> submit(@Valid @RequestBody BorrowRequestCreate body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.submit(accountId(auth),body));}
 @GetMapping("/borrow-requests/mine") public PageResponse<BorrowRequestResponse> mineRequests(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineRequests(accountId(auth),page,size);}
 @GetMapping("/borrow-requests") public PageResponse<BorrowRequestResponse> queue(@RequestParam(required=false) BorrowRequestStatus status,@RequestParam(required=false) UUID bookId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return borrowing.queue(status,bookId,page,size);}
 @PostMapping("/borrow-requests/{requestId}/decision") public BorrowRequestResponse decide(@PathVariable UUID requestId,@Valid @RequestBody RequestDecisionInput body,Authentication auth){return borrowing.decide(requestId,accountId(auth),body);}
 @PostMapping("/borrow-requests/{requestId}/issue") public ResponseEntity<LoanResponse> issue(@PathVariable UUID requestId,@Valid @RequestBody IssueRequest body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.issue(requestId,accountId(auth),body));}
 @GetMapping("/loans/mine") public PageResponse<LoanResponse> mineCurrent(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineCurrent(accountId(auth),page,size);}
 @GetMapping("/loans/mine/history") public PageResponse<LoanResponse> mineHistory(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineHistory(accountId(auth),page,size);}
 @GetMapping("/loans")
 public PageResponse<LoanResponse> librarianLoans(
     @RequestParam(required=false) LoanStatus status,
     @RequestParam(required=false) LocalDate dueBefore,
     @RequestParam(defaultValue="false") boolean overdueOnly,
     @RequestParam(required=false) String search,
     @RequestParam(required=false) com.libtrack.auth.AccountRole role,
     @RequestParam(required=false) UUID bookId,
     @RequestParam(required=false) LocalDate fromDate,
     @RequestParam(required=false) LocalDate toDate,
     @RequestParam(required=false) ReturnCondition condition,
     @RequestParam(defaultValue="false") boolean historyOnly,
     @RequestParam(defaultValue="0") int page,
     @RequestParam(defaultValue="20") int size
 ) {
   return borrowing.librarianLoans(status, dueBefore, overdueOnly, search, role, bookId, fromDate, toDate, condition, historyOnly, page, size);
 }

 @GetMapping("/circulation/summary")
 public CirculationSummaryResponse summary() {
   return borrowing.getCirculationSummary();
 }

 @GetMapping("/circulation/lost-damaged")
 public PageResponse<LostDamagedCopyItem> lostDamaged(
     @RequestParam(required=false) String condition,
     @RequestParam(required=false) String search,
     @RequestParam(defaultValue="0") int page,
     @RequestParam(defaultValue="20") int size
 ) {
   return borrowing.getLostAndDamagedCopies(condition, search, page, size);
 }

 @GetMapping("/circulation/stats")
 public CirculationStatsResponse stats() {
   return borrowing.getCirculationStats();
 }
 @PostMapping("/loans/{loanId}/renew") public LoanResponse renew(@PathVariable UUID loanId,Authentication auth){return borrowing.renew(loanId,accountId(auth));}
 @PostMapping("/loans/{loanId}/return") public LoanResponse returnLoan(@PathVariable UUID loanId,@Valid @RequestBody ReturnRequest body,Authentication auth){return borrowing.recordReturn(loanId,accountId(auth),body);}
 @PutMapping("/circulation/loans/{loanId}/condition")
 public LoanResponse updateCondition(@PathVariable UUID loanId, @Valid @RequestBody UpdateConditionRequest body, Authentication auth) {
   return borrowing.updateLoanCondition(loanId, accountId(auth), body);
 }
 @PutMapping("/loans/{loanId}/condition")
 public LoanResponse updateLoanConditionDirect(@PathVariable UUID loanId, @Valid @RequestBody UpdateConditionRequest body, Authentication auth) {
   return borrowing.updateLoanCondition(loanId, accountId(auth), body);
 }
 @GetMapping("/holidays") public List<LibraryHolidayResponse> holidays(){return borrowing.holidays();}
 @PostMapping("/holidays") public ResponseEntity<LibraryHolidayResponse> addHoliday(@Valid @RequestBody LibraryHolidayInput body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.addHoliday(accountId(auth),body));}
 @PutMapping("/holidays/{holidayId}") public ResponseEntity<LibraryHolidayResponse> updateHoliday(@PathVariable UUID holidayId,@Valid @RequestBody LibraryHolidayInput body,Authentication auth){return ResponseEntity.ok(borrowing.updateHoliday(holidayId,accountId(auth),body));}
 @DeleteMapping("/holidays/{holidayId}") public ResponseEntity<Void> deleteHoliday(@PathVariable UUID holidayId){borrowing.deleteHoliday(holidayId);return ResponseEntity.noContent().build();}

 @GetMapping("/loans/{loanId}/receipt")
 @PreAuthorize("hasAnyRole('STUDENT','FACULTY','LIBRARIAN')")
 public ResponseEntity<LoanReceiptResponse> getLoanReceipt(
     @PathVariable UUID loanId,
     Authentication auth
 ) {
   boolean isLibrarian = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_LIBRARIAN"));
   return ResponseEntity.ok(loanReceiptService.getReceiptResponse(loanId, accountId(auth), isLibrarian));
 }

 @GetMapping("/loans/{loanId}/receipt/pdf")
 @PreAuthorize("hasAnyRole('STUDENT','FACULTY','LIBRARIAN')")
 public ResponseEntity<byte[]> getLoanReceiptPdf(
     @PathVariable UUID loanId,
     Authentication auth
 ) {
   boolean isLibrarian = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_LIBRARIAN"));
   byte[] pdfBytes = loanReceiptService.generateReceiptPdf(loanId, accountId(auth), isLibrarian);
   LoanReceipt receipt = loanReceiptService.getReceiptForLoan(loanId, accountId(auth), isLibrarian);
   String filename = "receipt-" + receipt.getReceiptNumber() + ".pdf";

   return ResponseEntity.ok()
       .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
       .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
       .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
       .body(pdfBytes);
 }
}
