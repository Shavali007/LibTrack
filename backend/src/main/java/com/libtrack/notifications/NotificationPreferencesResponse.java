package com.libtrack.notifications;

public record NotificationPreferencesResponse(
        boolean borrowRequestUpdates,
        boolean loanDueReminders,
        boolean overdueFineAlerts,
        boolean bookRecommendations,
        boolean newBookArrivals,
        boolean wishlistBookAlerts,
        boolean departmentBookArrivals,
        boolean libraryAnnouncements
) {
    public NotificationPreferencesResponse(
            boolean borrowRequestUpdates,
            boolean loanDueReminders,
            boolean overdueFineAlerts,
            boolean bookRecommendations,
            boolean newBookArrivals,
            boolean departmentBookArrivals,
            boolean libraryAnnouncements
    ) {
        this(borrowRequestUpdates, loanDueReminders, overdueFineAlerts, bookRecommendations, newBookArrivals, true, departmentBookArrivals, libraryAnnouncements);
    }

    public static NotificationPreferencesResponse defaults() {
        return new NotificationPreferencesResponse(true, true, true, true, true, true, true, true);
    }

    public static NotificationPreferencesResponse from(UserNotificationPreference pref) {
        if (pref == null) {
            return defaults();
        }
        return new NotificationPreferencesResponse(
                pref.isBorrowRequestUpdates(),
                pref.isLoanDueReminders(),
                pref.isOverdueFineAlerts(),
                pref.isBookRecommendations(),
                pref.isNewBookArrivals(),
                pref.isWishlistBookAlerts(),
                pref.isDepartmentBookArrivals(),
                pref.isLibraryAnnouncements()
        );
    }
}
