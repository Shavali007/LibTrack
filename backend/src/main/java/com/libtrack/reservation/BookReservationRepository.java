package com.libtrack.reservation;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookReservationRepository extends JpaRepository<BookReservation, UUID> {

    List<BookReservation> findByStudent_IdOrderByCreatedAtDesc(UUID studentId);

    List<BookReservation> findByStudent_IdAndStatusOrderByCreatedAtDesc(UUID studentId, ReservationStatus status);

    boolean existsByBook_IdAndStudent_IdAndStatusIn(UUID bookId, UUID studentId, Collection<ReservationStatus> statuses);

    Optional<BookReservation> findFirstByBook_IdAndStudent_IdAndStatusIn(UUID bookId, UUID studentId, Collection<ReservationStatus> statuses);

    List<BookReservation> findByBook_IdAndStatusInOrderByCreatedAtAscIdAsc(UUID bookId, Collection<ReservationStatus> statuses);

    List<BookReservation> findByStatusAndHoldExpiresAtBefore(ReservationStatus status, Instant cutoff);

    @Query("SELECT COUNT(r) FROM BookReservation r " +
           "WHERE r.book.id = :bookId " +
           "AND r.status IN (com.libtrack.reservation.ReservationStatus.WAITING_FOR_AVAILABILITY, com.libtrack.reservation.ReservationStatus.IN_QUEUE) " +
           "AND (r.createdAt < :createdAt OR (r.createdAt = :createdAt AND r.id < :id))")
    long countWaitingAhead(@Param("bookId") UUID bookId, @Param("createdAt") Instant createdAt, @Param("id") UUID id);

    long countByBook_IdAndStatus(UUID bookId, ReservationStatus status);

    long countByBook_IdAndStatusIn(UUID bookId, Collection<ReservationStatus> statuses);

    Optional<BookReservation> findByBorrowRequest_Id(UUID borrowRequestId);

    boolean existsByAssignedCopy_IdAndStatus(UUID copyId, ReservationStatus status);

    long countByStudent_Id(UUID studentId);

    long countByStudent_IdAndStatus(UUID studentId, ReservationStatus status);

    long countByStudent_IdAndStatusIn(UUID studentId, Collection<ReservationStatus> statuses);
}
