package com.libtrack.catalogue;

public final class InvalidCopyStateException extends RuntimeException {
    public InvalidCopyStateException() { super("Copy status can only be changed by the circulation service while it is on loan."); }
}
