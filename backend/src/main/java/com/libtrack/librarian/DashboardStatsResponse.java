package com.libtrack.librarian;

public record DashboardStatsResponse(
    long totalBooks,
    long bookCopies,
    long activeMembers,
    long pendingRequests
) {}
