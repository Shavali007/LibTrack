package com.libtrack.circulation;

import com.libtrack.auth.AccountUserDetails;
import com.libtrack.catalogue.PageResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class CirculationController {
 private final BorrowingService borrowing;
 public CirculationController(BorrowingService borrowing){this.borrowing=borrowing;}
 private static UUID accountId(Authentication authentication){return ((AccountUserDetails)authentication.getPrincipal()).getId();}
 @PostMapping("/borrow-requests") public ResponseEntity<BorrowRequestResponse> submit(@Valid @RequestBody BorrowRequestCreate body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.submit(accountId(auth),body));}
 @GetMapping("/borrow-requests/mine") public PageResponse<BorrowRequestResponse> mineRequests(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineRequests(accountId(auth),page,size);}
 @GetMapping("/borrow-requests") public PageResponse<BorrowRequestResponse> queue(@RequestParam(required=false) BorrowRequestStatus status,@RequestParam(required=false) UUID bookId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return borrowing.queue(status,bookId,page,size);}
 @PostMapping("/borrow-requests/{requestId}/decision") public BorrowRequestResponse decide(@PathVariable UUID requestId,@Valid @RequestBody RequestDecisionInput body,Authentication auth){return borrowing.decide(requestId,accountId(auth),body);}
 @PostMapping("/borrow-requests/{requestId}/issue") public ResponseEntity<LoanResponse> issue(@PathVariable UUID requestId,@Valid @RequestBody IssueRequest body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.issue(requestId,accountId(auth),body));}
 @GetMapping("/loans/mine") public PageResponse<LoanResponse> mineCurrent(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineCurrent(accountId(auth),page,size);}
 @GetMapping("/loans/mine/history") public PageResponse<LoanResponse> mineHistory(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,Authentication auth){return borrowing.mineHistory(accountId(auth),page,size);}
 @GetMapping("/loans") public PageResponse<LoanResponse> librarianLoans(@RequestParam(required=false) LoanStatus status,@RequestParam(required=false) LocalDate dueBefore,@RequestParam(defaultValue="false") boolean overdueOnly,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return borrowing.librarianLoans(status,dueBefore,overdueOnly,page,size);}
 @PostMapping("/loans/{loanId}/renew") public LoanResponse renew(@PathVariable UUID loanId,Authentication auth){return borrowing.renew(loanId,accountId(auth));}
 @PostMapping("/loans/{loanId}/return") public LoanResponse returnLoan(@PathVariable UUID loanId,@Valid @RequestBody ReturnRequest body,Authentication auth){return borrowing.recordReturn(loanId,accountId(auth),body);}
 @GetMapping("/holidays") public List<LibraryHolidayResponse> holidays(){return borrowing.holidays();}
 @PostMapping("/holidays") public ResponseEntity<LibraryHolidayResponse> addHoliday(@Valid @RequestBody LibraryHolidayInput body,Authentication auth){return ResponseEntity.status(HttpStatus.CREATED).body(borrowing.addHoliday(accountId(auth),body));}
 @DeleteMapping("/holidays/{holidayId}") public ResponseEntity<Void> deleteHoliday(@PathVariable UUID holidayId){borrowing.deleteHoliday(holidayId);return ResponseEntity.noContent().build();}
}
