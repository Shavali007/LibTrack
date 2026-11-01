package com.libtrack.reservation;

public class UnauthorizedReservationActionException extends RuntimeException {
    public UnauthorizedReservationActionException(String message) {
        super(message);
    }
}
