package com.libtrack.review;

public class IneligibleReviewException extends RuntimeException {
    public IneligibleReviewException(String message) {
        super(message);
    }
}
