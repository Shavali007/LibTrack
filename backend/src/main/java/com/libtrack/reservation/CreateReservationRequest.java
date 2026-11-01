package com.libtrack.reservation;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateReservationRequest(
        @NotNull(message = "Book ID is required.")
        UUID bookId
) {}
