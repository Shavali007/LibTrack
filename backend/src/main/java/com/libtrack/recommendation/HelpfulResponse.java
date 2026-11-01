package com.libtrack.recommendation;

import java.util.UUID;

public record HelpfulResponse(
    UUID recommendationId,
    long helpfulCount,
    boolean markedHelpful
) {}
