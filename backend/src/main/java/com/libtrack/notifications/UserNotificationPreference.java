package com.libtrack.notifications;

import java.time.Instant;
import java.util.UUID;

import com.libtrack.auth.UserAccount;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_notification_preference")
public class UserNotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_account_id", nullable = false, unique = true)
    private UserAccount userAccount;

    @Column(name = "borrow_request_updates", nullable = false)
    private boolean borrowRequestUpdates = true;

    @Column(name = "loan_due_reminders", nullable = false)
    private boolean loanDueReminders = true;

    @Column(name = "overdue_fine_alerts", nullable = false)
    private boolean overdueFineAlerts = true;

    @Column(name = "book_recommendations", nullable = false)
    private boolean bookRecommendations = true;

    @Column(name = "new_book_arrivals", nullable = false)
    private boolean newBookArrivals = true;

    @Column(name = "wishlist_book_alerts", nullable = false)
    private boolean wishlistBookAlerts = true;

    @Column(name = "department_book_arrivals", nullable = false)
    private boolean departmentBookArrivals = true;

    @Column(name = "library_announcements", nullable = false)
    private boolean libraryAnnouncements = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserNotificationPreference() {}

    public UserNotificationPreference(UserAccount userAccount) {
        this.userAccount = userAccount;
        this.borrowRequestUpdates = true;
        this.loanDueReminders = true;
        this.overdueFineAlerts = true;
        this.bookRecommendations = true;
        this.newBookArrivals = true;
        this.wishlistBookAlerts = true;
        this.departmentBookArrivals = true;
        this.libraryAnnouncements = true;
    }

    public UserNotificationPreference(UserAccount userAccount,
                                      boolean borrowRequestUpdates,
                                      boolean loanDueReminders,
                                      boolean overdueFineAlerts,
                                      boolean bookRecommendations,
                                      boolean newBookArrivals,
                                      boolean wishlistBookAlerts,
                                      boolean departmentBookArrivals,
                                      boolean libraryAnnouncements) {
        this.userAccount = userAccount;
        this.borrowRequestUpdates = borrowRequestUpdates;
        this.loanDueReminders = loanDueReminders;
        this.overdueFineAlerts = overdueFineAlerts;
        this.bookRecommendations = bookRecommendations;
        this.newBookArrivals = newBookArrivals;
        this.wishlistBookAlerts = wishlistBookAlerts;
        this.departmentBookArrivals = departmentBookArrivals;
        this.libraryAnnouncements = libraryAnnouncements;
    }

    public UserNotificationPreference(UserAccount userAccount,
                                      boolean borrowRequestUpdates,
                                      boolean loanDueReminders,
                                      boolean overdueFineAlerts,
                                      boolean bookRecommendations,
                                      boolean newBookArrivals,
                                      boolean departmentBookArrivals,
                                      boolean libraryAnnouncements) {
        this(userAccount, borrowRequestUpdates, loanDueReminders, overdueFineAlerts, bookRecommendations, newBookArrivals, true, departmentBookArrivals, libraryAnnouncements);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UserAccount getUserAccount() { return userAccount; }

    public boolean isBorrowRequestUpdates() { return borrowRequestUpdates; }
    public void setBorrowRequestUpdates(boolean borrowRequestUpdates) { this.borrowRequestUpdates = borrowRequestUpdates; }

    public boolean isLoanDueReminders() { return loanDueReminders; }
    public void setLoanDueReminders(boolean loanDueReminders) { this.loanDueReminders = loanDueReminders; }

    public boolean isOverdueFineAlerts() { return overdueFineAlerts; }
    public void setOverdueFineAlerts(boolean overdueFineAlerts) { this.overdueFineAlerts = overdueFineAlerts; }

    public boolean isBookRecommendations() { return bookRecommendations; }
    public void setBookRecommendations(boolean bookRecommendations) { this.bookRecommendations = bookRecommendations; }

    public boolean isNewBookArrivals() { return newBookArrivals; }
    public void setNewBookArrivals(boolean newBookArrivals) { this.newBookArrivals = newBookArrivals; }

    public boolean isWishlistBookAlerts() { return wishlistBookAlerts; }
    public void setWishlistBookAlerts(boolean wishlistBookAlerts) { this.wishlistBookAlerts = wishlistBookAlerts; }

    public boolean isDepartmentBookArrivals() { return departmentBookArrivals; }
    public void setDepartmentBookArrivals(boolean departmentBookArrivals) { this.departmentBookArrivals = departmentBookArrivals; }

    public boolean isLibraryAnnouncements() { return libraryAnnouncements; }
    public void setLibraryAnnouncements(boolean libraryAnnouncements) { this.libraryAnnouncements = libraryAnnouncements; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
