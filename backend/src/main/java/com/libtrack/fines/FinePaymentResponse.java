package com.libtrack.fines;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FinePaymentResponse(
        UUID id,
        BigDecimal amount,
        Instant paymentDate,
        String receiptNumber,
        String recordedByEmail
) {}
