package com.libtrack.reservation;

public enum ReservationStatus {
    WAITING_FOR_AVAILABILITY,
    IN_QUEUE,
    READY_FOR_PICKUP,
    COMPLETED,
    CANCELLED,
    EXPIRED;

    public boolean isActive() {
        return this == WAITING_FOR_AVAILABILITY || this == IN_QUEUE || this == READY_FOR_PICKUP;
    }

    public boolean isWaiting() {
        return this == WAITING_FOR_AVAILABILITY || this == IN_QUEUE;
    }
}
