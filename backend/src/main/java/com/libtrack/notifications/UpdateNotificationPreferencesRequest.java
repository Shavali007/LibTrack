package com.libtrack.notifications;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateNotificationPreferencesRequest(
        Boolean borrowRequestUpdates,
        Boolean loanDueReminders,
        Boolean overdueFineAlerts,
        Boolean bookRecommendations,
        Boolean newBookArrivals,
        Boolean wishlistBookAlerts,
        Boolean departmentBookArrivals,
        Boolean libraryAnnouncements
) {
    public UpdateNotificationPreferencesRequest(
            Boolean borrowRequestUpdates,
            Boolean loanDueReminders,
            Boolean overdueFineAlerts,
            Boolean bookRecommendations,
            Boolean newBookArrivals,
            Boolean departmentBookArrivals,
            Boolean libraryAnnouncements
    ) {
        this(borrowRequestUpdates, loanDueReminders, overdueFineAlerts, bookRecommendations, newBookArrivals, null, departmentBookArrivals, libraryAnnouncements);
    }

    public UpdateNotificationPreferencesRequest(
            Boolean borrowRequestUpdates,
            Boolean loanDueReminders,
            Boolean overdueFineAlerts,
            Boolean bookRecommendations,
            Boolean libraryAnnouncements
    ) {
        this(borrowRequestUpdates, loanDueReminders, overdueFineAlerts, bookRecommendations, null, null, null, libraryAnnouncements);
    }
}
