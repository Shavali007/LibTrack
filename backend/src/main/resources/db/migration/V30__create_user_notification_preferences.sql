CREATE TABLE user_notification_preference (
    id BINARY(16) NOT NULL,
    user_account_id BINARY(16) NOT NULL,
    borrow_request_updates BOOLEAN NOT NULL DEFAULT TRUE,
    loan_due_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    overdue_fine_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    book_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
    library_announcements BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_user_notification_preference PRIMARY KEY (id),
    CONSTRAINT uq_user_notification_preference_user UNIQUE (user_account_id),
    CONSTRAINT fk_user_notif_pref_user FOREIGN KEY (user_account_id) REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX ix_user_notif_pref_user ON user_notification_preference (user_account_id);
