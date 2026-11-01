package com.libtrack.reservation;

public class BookNotReservableException extends RuntimeException {
    public BookNotReservableException(String message) {
        super(message);
    }
}
