package com.libtrack.reports;

import java.util.UUID;

public record TopBorrowedBookItem(
    UUID bookId,
    String title,
    String author,
    String isbn,
    long loanCount
) {}
