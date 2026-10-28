package com.libtrack.catalogue;

import java.util.UUID;

public record BookAvailability(UUID bookId, Long totalCopies, Long availableCopies, Long onLoanCopies,
                               Long lostCopies, Long damagedCopies, Long withdrawnCopies) {}
