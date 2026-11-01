package com.libtrack.reservation;

public record ReservationCountsResponse(
        long all,
        long waiting,
        long inQueue,
        long readyForPickup,
        long completed,
        long cancelled
) {}
