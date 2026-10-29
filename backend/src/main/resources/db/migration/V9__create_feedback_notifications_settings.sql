CREATE TABLE user_feedback (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_user_feedback_account ON user_feedback (account_id);
CREATE INDEX ix_user_feedback_created ON user_feedback (created_at);

CREATE TABLE app_notification (
    id UUID PRIMARY KEY,
    recipient_account_id UUID REFERENCES user_account(id) ON DELETE CASCADE,
    target_role VARCHAR(20),
    title VARCHAR(150) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_app_notification_recipient ON app_notification (recipient_account_id);
CREATE INDEX ix_app_notification_role ON app_notification (target_role);

CREATE TABLE system_setting (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_account_id UUID REFERENCES user_account(id) ON DELETE SET NULL
);

INSERT INTO system_setting (setting_key, setting_value) VALUES
('loan.period.student.days', '14'),
('loan.period.faculty.days', '30'),
('loan.renewal.limit', '1'),
('loan.max.active.student', '3'),
('loan.max.active.faculty', '5'),
('library.name', 'VIT-AP Central Library');
