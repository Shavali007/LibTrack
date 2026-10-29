package com.libtrack.digital;

public class DigitalEditionNotFoundException extends RuntimeException {
    public DigitalEditionNotFoundException(String message) {
        super(message);
    }

    public DigitalEditionNotFoundException() {
        super("Digital edition not found for this book.");
    }
}
