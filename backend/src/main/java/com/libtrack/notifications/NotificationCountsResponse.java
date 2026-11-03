package com.libtrack.notifications;

public record NotificationCountsResponse(
    long all,
    long unread,
    long read
) {}
