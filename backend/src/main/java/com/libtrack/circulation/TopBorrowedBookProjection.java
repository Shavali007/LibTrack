package com.libtrack.circulation;

import java.util.UUID;

public interface TopBorrowedBookProjection {
    UUID getBookId();
    String getTitle();
    String getIsbn();
    long getLoanCount();
}
