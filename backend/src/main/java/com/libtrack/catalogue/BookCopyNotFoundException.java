package com.libtrack.catalogue;

public final class BookCopyNotFoundException extends RuntimeException {
    public BookCopyNotFoundException() { super("Book copy was not found."); }
}
