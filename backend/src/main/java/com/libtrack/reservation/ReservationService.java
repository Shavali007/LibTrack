package com.libtrack.reservation;

import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Author;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookCopy;
import com.libtrack.catalogue.BookCopyRepository;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import com.libtrack.catalogue.Category;
import com.libtrack.catalogue.CirculationPolicy;
import com.libtrack.catalogue.CopyStatus;
import com.libtrack.circulation.BorrowRequest;
import com.libtrack.circulation.BorrowRequestEvent;
import com.libtrack.circulation.BorrowRequestEventRepository;
import com.libtrack.circulation.BorrowRequestEventType;
import com.libtrack.circulation.BorrowRequestRepository;
import com.libtrack.circulation.BorrowRequestStatus;
import com.libtrack.circulation.Loan;
import com.libtrack.circulation.LoanRepository;
import com.libtrack.circulation.LoanStatus;
import com.libtrack.circulation.RequestDecision;
import com.libtrack.notifications.NotificationService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReservationService {

    public static final Duration HOLD_DURATION = Duration.ofDays(30);

    public Instant calculateHoldExpiry(Instant holdStartedAt) {
        return holdStartedAt.atZone(clock.getZone()).plusMonths(1).toInstant();
    }

    private final BookReservationRepository reservationRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository copyRepository;
    private final UserAccountRepository userAccountRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final BorrowRequestEventRepository borrowRequestEventRepository;
    private final LoanRepository loanRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public ReservationService(
            BookReservationRepository reservationRepository,
            BookRepository bookRepository,
            BookCopyRepository copyRepository,
            UserAccountRepository userAccountRepository,
            BorrowRequestRepository borrowRequestRepository,
            BorrowRequestEventRepository borrowRequestEventRepository,
            LoanRepository loanRepository,
            NotificationService notificationService,
            Clock clock
    ) {
        this.reservationRepository = reservationRepository;
        this.bookRepository = bookRepository;
        this.copyRepository = copyRepository;
        this.userAccountRepository = userAccountRepository;
        this.borrowRequestRepository = borrowRequestRepository;
        this.borrowRequestEventRepository = borrowRequestEventRepository;
        this.loanRepository = loanRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    public ReservationResponse createReservation(UUID studentId, CreateReservationRequest request) {
        expireOverdueHolds();

        UserAccount student = userAccountRepository.findByIdForUpdate(studentId)
                .orElseThrow(() -> new UnauthorizedReservationActionException("User account not found."));

        if (!student.isEnabled()) {
            throw new UnauthorizedReservationActionException("Your account is not active.");
        }

        if (student.getRole() != AccountRole.STUDENT && student.getRole() != AccountRole.FACULTY) {
            throw new UnauthorizedReservationActionException("Only students and faculty can place book reservations.");
        }

        long activeCount = reservationRepository.countByStudent_IdAndStatusIn(
                studentId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)
        );
        if (activeCount >= 5) {
            throw new BookNotReservableException("You have reached the maximum limit of 5 active reservations.");
        }

        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new BookNotFoundException());

        if (!book.isActive()) {
            throw new BookNotReservableException("Inactive books cannot be reserved.");
        }

        if (book.getCirculationPolicy() != CirculationPolicy.STANDARD) {
            throw new BookNotReservableException("Only circulating books with standard policy can be reserved.");
        }

        if (loanRepository.existsByBorrower_IdAndCopy_Book_IdAndStatus(studentId, book.getId(), LoanStatus.ACTIVE)) {
            throw new BookNotReservableException("You already have an active loan for this book.");
        }

        if (reservationRepository.existsByBook_IdAndStudent_IdAndStatusIn(
                book.getId(),
                studentId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)
        )) {
            throw new DuplicateReservationException("You already have an active reservation for this book.");
        }

        long availableCount = copyRepository.countByBookIdAndStatus(book.getId(), CopyStatus.AVAILABLE);
        long heldCount = reservationRepository.countByBook_IdAndStatus(book.getId(), ReservationStatus.READY_FOR_PICKUP);
        long freeAvailable = Math.max(0, availableCount - heldCount);

        if (freeAvailable > 0) {
            throw new BookNotReservableException("Copies of this book are currently available for immediate borrowing.");
        }

        long waitingAhead = reservationRepository.countByBook_IdAndStatusIn(
                book.getId(),
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE)
        );
        long newPosition = waitingAhead + 1;

        long onLoanCount = copyRepository.countByBookIdAndStatus(book.getId(), CopyStatus.ON_LOAN);
        ReservationStatus initialStatus = (newPosition <= Math.max(1, onLoanCount))
                ? ReservationStatus.WAITING_FOR_AVAILABILITY
                : ReservationStatus.IN_QUEUE;

        Instant now = clock.instant();
        BookReservation reservation = new BookReservation(book, student, initialStatus, now);
        BookReservation saved = reservationRepository.saveAndFlush(reservation);

        notificationService.sendSystemNotification(
                student.getId(),
                "Reservation Created",
                "Your reservation for " + book.getTitle() + " has been placed successfully.",
                "RESERVATION"
        );

        return toResponse(saved);
    }

    public ReservationResponse cancelReservation(UUID studentId, UUID reservationId) {
        expireOverdueHolds();

        BookReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException("Reservation not found."));

        if (!reservation.getStudent().getId().equals(studentId)) {
            throw new UnauthorizedReservationActionException("You can only cancel your own reservations.");
        }

        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new BookNotReservableException("Cannot cancel a completed reservation.");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            return toResponse(reservation);
        }

        Instant now = clock.instant();
        BookCopy copyToRelease = null;
        if (reservation.getStatus() == ReservationStatus.READY_FOR_PICKUP) {
            copyToRelease = reservation.getAssignedCopy();
            if (reservation.getBorrowRequest() != null) {
                BorrowRequest req = reservation.getBorrowRequest();
                if (req.getStatus() == BorrowRequestStatus.PENDING) {
                    req.decide(RequestDecision.REJECT, null, "Reservation was cancelled by member.", now);
                }
            }
        }

        reservation.cancel(now);
        BookReservation saved = reservationRepository.saveAndFlush(reservation);

        notificationService.sendSystemNotification(
                studentId,
                "Reservation Cancelled",
                "Your reservation for " + saved.getBook().getTitle() + " has been cancelled.",
                "RESERVATION"
        );

        if (copyToRelease != null) {
            processQueueForCopy(copyToRelease);
        }

        notifyQueuePositionChanges(saved.getBook().getId());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(UUID studentId, String statusTab) {
        List<BookReservation> list;
        if (statusTab == null || statusTab.isBlank() || "all".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdOrderByCreatedAtDesc(studentId);
        } else if ("waiting".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdAndStatusOrderByCreatedAtDesc(studentId, ReservationStatus.WAITING_FOR_AVAILABILITY);
        } else if ("inQueue".equalsIgnoreCase(statusTab) || "in_queue".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdAndStatusOrderByCreatedAtDesc(studentId, ReservationStatus.IN_QUEUE);
        } else if ("readyForPickup".equalsIgnoreCase(statusTab) || "ready_for_pickup".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdAndStatusOrderByCreatedAtDesc(studentId, ReservationStatus.READY_FOR_PICKUP);
        } else if ("completed".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdAndStatusOrderByCreatedAtDesc(studentId, ReservationStatus.COMPLETED);
        } else if ("cancelled".equalsIgnoreCase(statusTab)) {
            list = reservationRepository.findByStudent_IdAndStatusOrderByCreatedAtDesc(studentId, ReservationStatus.CANCELLED);
        } else {
            list = reservationRepository.findByStudent_IdOrderByCreatedAtDesc(studentId);
        }

        return list.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReservationCountsResponse getCounts(UUID studentId) {
        long all = reservationRepository.countByStudent_Id(studentId);
        long waiting = reservationRepository.countByStudent_IdAndStatus(studentId, ReservationStatus.WAITING_FOR_AVAILABILITY);
        long inQueue = reservationRepository.countByStudent_IdAndStatus(studentId, ReservationStatus.IN_QUEUE);
        long readyForPickup = reservationRepository.countByStudent_IdAndStatus(studentId, ReservationStatus.READY_FOR_PICKUP);
        long completed = reservationRepository.countByStudent_IdAndStatus(studentId, ReservationStatus.COMPLETED);
        long cancelled = reservationRepository.countByStudent_IdAndStatus(studentId, ReservationStatus.CANCELLED);

        return new ReservationCountsResponse(all, waiting, inQueue, readyForPickup, completed, cancelled);
    }

    @Transactional(readOnly = true)
    public Optional<ReservationResponse> getActiveReservationForBook(UUID studentId, UUID bookId) {
        return reservationRepository.findFirstByBook_IdAndStudent_IdAndStatusIn(
                bookId,
                studentId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE, ReservationStatus.READY_FOR_PICKUP)
        ).map(this::toResponse);
    }

    public void processQueueForCopy(BookCopy copy) {
        if (copy == null || copy.getStatus() != CopyStatus.AVAILABLE) {
            return;
        }

        if (reservationRepository.existsByAssignedCopy_IdAndStatus(copy.getId(), ReservationStatus.READY_FOR_PICKUP)) {
            return;
        }

        UUID bookId = copy.getBook().getId();
        List<BookReservation> waitingReservations = reservationRepository.findByBook_IdAndStatusInOrderByCreatedAtAscIdAsc(
                bookId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE)
        );

        if (waitingReservations.isEmpty()) {
            return;
        }

        Instant now = clock.instant();
        for (BookReservation candidate : waitingReservations) {
            UserAccount student = candidate.getStudent();

            if (!student.isEnabled()) {
                candidate.cancel(now);
                reservationRepository.save(candidate);
                continue;
            }

            if (loanRepository.existsByBorrower_IdAndCopy_Book_IdAndStatus(student.getId(), bookId, LoanStatus.ACTIVE)
                    || borrowRequestRepository.existsByBorrower_IdAndBook_IdAndStatusIn(student.getId(), bookId, List.of(BorrowRequestStatus.PENDING, BorrowRequestStatus.APPROVED))) {
                continue;
            }

            long activeLoans = loanRepository.countByBorrower_IdAndStatus(student.getId(), LoanStatus.ACTIVE);
            if (activeLoans >= 5) {
                continue;
            }

            Instant holdExpires = calculateHoldExpiry(now);

            BorrowRequest req = new BorrowRequest(student, candidate.getBook(), now);
            req = borrowRequestRepository.saveAndFlush(req);
            borrowRequestEventRepository.save(new BorrowRequestEvent(
                    req, BorrowRequestEventType.SUBMITTED, student, "Allocated automatically via reservation queue priority.", now
            ));

            candidate.assignCopyAndHold(copy, req, now, holdExpires);
            reservationRepository.saveAndFlush(candidate);

            notificationService.sendSystemNotification(
                    student.getId(),
                    "Ready for Pickup",
                    "Good news! " + candidate.getBook().getTitle() + " is now available for you. Please collect it within 1 calendar month.",
                    "RESERVATION"
            );

            notifyQueuePositionChanges(bookId);
            return;
        }
    }

    public void handleBorrowRequestRejection(UUID borrowRequestId) {
        reservationRepository.findByBorrowRequest_Id(borrowRequestId).ifPresent(res -> {
            BookCopy copy = res.getAssignedCopy();
            res.cancel(clock.instant());
            reservationRepository.save(res);
            if (copy != null) {
                processQueueForCopy(copy);
            }
            notifyQueuePositionChanges(res.getBook().getId());
        });
    }

    public void expireOverdueHolds() {
        Instant now = clock.instant();
        List<BookReservation> overdue = reservationRepository.findByStatusAndHoldExpiresAtBefore(
                ReservationStatus.READY_FOR_PICKUP, now
        );

        for (BookReservation res : overdue) {
            BookCopy copy = res.getAssignedCopy();
            res.expire(now);
            reservationRepository.save(res);

            notificationService.sendSystemNotification(
                    res.getStudent().getId(),
                    "Reservation Expired",
                    "Your reservation for " + res.getBook().getTitle() + " has expired because the pickup period ended.",
                    "RESERVATION"
            );

            if (copy != null) {
                processQueueForCopy(copy);
            }
        }
    }

    public void markCompletedForBorrowRequest(UUID borrowRequestId) {
        reservationRepository.findByBorrowRequest_Id(borrowRequestId).ifPresent(res -> {
            res.markCompleted(clock.instant());
            reservationRepository.save(res);
        });
    }

    public void processQueueForBook(UUID bookId, UUID copyId) {
        copyRepository.findById(copyId).ifPresent(this::processQueueForCopy);
    }

    private void notifyQueuePositionChanges(UUID bookId) {
        List<BookReservation> waiting = reservationRepository.findByBook_IdAndStatusInOrderByCreatedAtAscIdAsc(
                bookId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE)
        );

        long onLoanCount = copyRepository.countByBookIdAndStatus(bookId, CopyStatus.ON_LOAN);

        for (int i = 0; i < waiting.size(); i++) {
            BookReservation r = waiting.get(i);
            long pos = i + 1;
            ReservationStatus newStatus = (pos <= Math.max(1, onLoanCount))
                    ? ReservationStatus.WAITING_FOR_AVAILABILITY
                    : ReservationStatus.IN_QUEUE;

            if (r.getStatus() != newStatus) {
                r.updateStatus(newStatus);
                reservationRepository.save(r);
            }

            notificationService.sendSystemNotification(
                    r.getStudent().getId(),
                    "Queue Position Changed",
                    "Your reservation for " + r.getBook().getTitle() + " is now at position #" + pos + ".",
                    "RESERVATION"
            );
        }
    }

    private ReservationResponse toResponse(BookReservation r) {
        Book b = r.getBook();
        List<String> authors = b.getAuthors().stream().map(Author::getName).toList();
        String category = b.getCategories().isEmpty() ? "General" : b.getCategories().iterator().next().getName();

        Long queuePosition = null;
        String statusDisplay;
        String availabilityHoldText;
        boolean canCancel = false;
        boolean canBorrowNow = false;

        switch (r.getStatus()) {
            case READY_FOR_PICKUP -> {
                statusDisplay = "Ready for Pickup";
                availabilityHoldText = formatRemainingHold(r.getHoldExpiresAt());
                canCancel = false;
                canBorrowNow = true;
            }
            case WAITING_FOR_AVAILABILITY -> {
                long pos = calculateQueuePosition(b.getId(), r.getId());
                queuePosition = pos;
                statusDisplay = "Waiting for Availability";
                availabilityHoldText = calculateEstimatedAvailability(b.getId(), pos);
                canCancel = true;
                canBorrowNow = false;
            }
            case IN_QUEUE -> {
                long pos = calculateQueuePosition(b.getId(), r.getId());
                queuePosition = pos;
                statusDisplay = "In Queue";
                availabilityHoldText = calculateEstimatedAvailability(b.getId(), pos);
                canCancel = true;
                canBorrowNow = false;
            }
            case COMPLETED -> {
                statusDisplay = "Completed";
                availabilityHoldText = "—";
            }
            case CANCELLED -> {
                statusDisplay = "Cancelled";
                availabilityHoldText = "—";
            }
            case EXPIRED -> {
                statusDisplay = "Expired";
                availabilityHoldText = "Hold expired";
            }
            default -> {
                statusDisplay = r.getStatus().name();
                availabilityHoldText = "—";
            }
        }

        return new ReservationResponse(
                r.getId(),
                b.getId(),
                b.getTitle(),
                authors,
                category,
                b.getCoverImageUrl(),
                r.getCreatedAt(),
                queuePosition,
                r.getStatus(),
                statusDisplay,
                availabilityHoldText,
                r.getHoldExpiresAt(),
                r.getAssignedCopy() != null ? r.getAssignedCopy().getId() : null,
                r.getBorrowRequest() != null ? r.getBorrowRequest().getId() : null,
                canCancel,
                canBorrowNow
        );
    }

    private long calculateQueuePosition(UUID bookId, UUID reservationId) {
        List<BookReservation> waiting = reservationRepository.findByBook_IdAndStatusInOrderByCreatedAtAscIdAsc(
                bookId,
                List.of(ReservationStatus.WAITING_FOR_AVAILABILITY, ReservationStatus.IN_QUEUE)
        );
        for (int i = 0; i < waiting.size(); i++) {
            if (waiting.get(i).getId().equals(reservationId)) {
                return i + 1;
            }
        }
        return 1;
    }

    private String formatRemainingHold(Instant expiresAt) {
        if (expiresAt == null) {
            return "Hold expires in 48 hours";
        }
        Instant now = clock.instant();
        if (now.isAfter(expiresAt)) {
            return "Hold expired";
        }
        Duration duration = Duration.between(now, expiresAt);
        long days = duration.toDays();
        long hours = duration.toHoursPart();
        if (days > 0) {
            return "Hold expires in " + days + " day" + (days > 1 ? "s " : " ") + hours + " hour" + (hours != 1 ? "s" : "");
        } else {
            long minutes = duration.toMinutesPart();
            if (hours > 0) {
                return "Hold expires in " + hours + " hour" + (hours != 1 ? "s " : " ") + minutes + " min" + (minutes != 1 ? "s" : "");
            } else {
                return "Hold expires in " + minutes + " min" + (minutes != 1 ? "s" : "");
            }
        }
    }

    private String calculateEstimatedAvailability(UUID bookId, long queuePosition) {
        List<Loan> activeLoans = loanRepository.findByCopy_Book_IdAndStatusOrderByDueDateAsc(bookId, LoanStatus.ACTIVE);
        if (activeLoans.isEmpty()) {
            return "—";
        }
        int index = (int) queuePosition - 1;
        if (index < 0 || index >= activeLoans.size()) {
            return "—";
        }
        Loan targetLoan = activeLoans.get(index);
        LocalDate dueDate = targetLoan.getDueDate();
        LocalDate today = LocalDate.now(clock);
        long days = ChronoUnit.DAYS.between(today, dueDate);
        if (days <= 0) {
            return "—";
        }
        return "Est. Available in ~" + days + " days";
    }
}
