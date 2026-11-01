package com.libtrack.reservation;

import com.libtrack.auth.AccountUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<ReservationResponse> create(
            @Valid @RequestBody CreateReservationRequest request,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        ReservationResponse response = reservationService.createReservation(studentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<List<ReservationResponse>> getMine(
            @RequestParam(name = "tab", required = false) String tab,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(reservationService.getMyReservations(studentId, tab));
    }

    @GetMapping("/counts")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<ReservationCountsResponse> getCounts(Authentication authentication) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(reservationService.getCounts(studentId));
    }

    @GetMapping("/books/{bookId}/active")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<ReservationResponse> getActiveForBook(
            @PathVariable("bookId") UUID bookId,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        Optional<ReservationResponse> active = reservationService.getActiveReservationForBook(studentId, bookId);
        return active.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<ReservationResponse> cancel(
            @PathVariable("id") UUID id,
            Authentication authentication
    ) {
        UUID studentId = extractAccountId(authentication);
        return ResponseEntity.ok(reservationService.cancelReservation(studentId, id));
    }

    private UUID extractAccountId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountUserDetails details) {
            return details.getId();
        }
        throw new UnauthorizedReservationActionException("Unauthenticated user.");
    }
}
