ALTER TABLE user_notification_preference
    ADD COLUMN new_book_arrivals BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN department_book_arrivals BOOLEAN NOT NULL DEFAULT TRUE;
