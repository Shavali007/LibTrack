package com.libtrack.catalogue;

import java.util.UUID;

public record BookAvailability(UUID bookId, Long totalCopies, Long availableCopies, Long onLoanCopies,
                               Long lostCopies, Long damagedCopies, Long withdrawnCopies) {
    public BookAvailability(UUID bookId, Number totalCopies, Number availableCopies, Number onLoanCopies,
                            Number lostCopies, Number damagedCopies, Number withdrawnCopies) {
        this(bookId,
             totalCopies == null ? 0L : totalCopies.longValue(),
             availableCopies == null ? 0L : availableCopies.longValue(),
             onLoanCopies == null ? 0L : onLoanCopies.longValue(),
             lostCopies == null ? 0L : lostCopies.longValue(),
             damagedCopies == null ? 0L : damagedCopies.longValue(),
             withdrawnCopies == null ? 0L : withdrawnCopies.longValue());
    }
}
