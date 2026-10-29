package com.libtrack.circulation;

import java.util.UUID;

public interface BorrowerLoanCount {
    UUID getBorrowerId();
    long getActiveCount();
}
