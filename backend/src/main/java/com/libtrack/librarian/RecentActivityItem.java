package com.libtrack.librarian;

import java.time.Instant;

public record RecentActivityItem(
    String id,
    String activityType,
    String bookTitle,
    String memberIdentifier,
    String memberEmail,
    Instant timestamp,
    String details
) {}
