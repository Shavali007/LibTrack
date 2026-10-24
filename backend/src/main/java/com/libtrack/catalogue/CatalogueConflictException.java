package com.libtrack.catalogue;

public final class CatalogueConflictException extends RuntimeException {
    public CatalogueConflictException() { super("An ISBN or inventory identifier is already in use."); }
}
