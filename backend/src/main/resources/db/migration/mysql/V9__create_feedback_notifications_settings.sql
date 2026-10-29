CREATE TABLE user_feedback (
    id BINARY(16) NOT NULL,
    account_id BINARY(16) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_user_feedback PRIMARY KEY (id),
    CONSTRAINT fk_user_feedback_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX ix_user_feedback_account ON user_feedback (account_id);
CREATE INDEX ix_user_feedback_created ON user_feedback (created_at);

CREATE TABLE app_notification (
    id BINARY(16) NOT NULL,
    recipient_account_id BINARY(16),
    target_role VARCHAR(20),
    title VARCHAR(150) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_app_notification PRIMARY KEY (id),
    CONSTRAINT fk_app_notification_recipient FOREIGN KEY (recipient_account_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX ix_app_notification_recipient ON app_notification (recipient_account_id);
CREATE INDEX ix_app_notification_role ON app_notification (target_role);

CREATE TABLE system_setting (
    setting_key VARCHAR(80) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_by_account_id BINARY(16),
    CONSTRAINT pk_system_setting PRIMARY KEY (setting_key),
    CONSTRAINT fk_system_setting_updater FOREIGN KEY (updated_by_account_id) REFERENCES user_account(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO system_setting (setting_key, setting_value) VALUES
('loan.period.student.days', '14'),
('loan.period.faculty.days', '30'),
('loan.renewal.limit', '1'),
('loan.max.active.student', '3'),
('loan.max.active.faculty', '5'),
('library.name', 'VIT-AP Central Library');
