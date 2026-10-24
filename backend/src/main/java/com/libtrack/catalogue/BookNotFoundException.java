package com.libtrack.catalogue;

public final class BookNotFoundException extends RuntimeException {
    public BookNotFoundException() { super("Book was not found."); }
}
