-- V10: Fine Management, Smart Renewals, Due-Date Notifications, and Holiday-Aware Circulation

-- 1. Alter loan table to snapshot fine policy terms at issuance
ALTER TABLE loan
    ADD COLUMN daily_fine_rate DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    ADD COLUMN max_fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    ADD COLUMN grace_period_days INT NOT NULL DEFAULT 0;

-- 2. Create fine table
CREATE TABLE fine (
    id BINARY(16) NOT NULL,
    loan_id BINARY(16) NOT NULL,
    borrower_account_id BINARY(16) NOT NULL,
    daily_fine_rate DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    max_fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    overdue_days INT NOT NULL DEFAULT 0,
    fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    assessed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    paid_at DATETIME(6) NULL,
    CONSTRAINT pk_fine PRIMARY KEY (id),
    CONSTRAINT uq_fine_loan UNIQUE (loan_id),
    CONSTRAINT ck_fine_status CHECK (status IN ('UNPAID', 'PAID')),
    CONSTRAINT fk_fine_loan FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fine_borrower FOREIGN KEY (borrower_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_fine_borrower_status ON fine (borrower_account_id, status);
CREATE INDEX ix_fine_status ON fine (status);

-- 3. Create fine_payment table
CREATE TABLE fine_payment (
    id BINARY(16) NOT NULL,
    fine_id BINARY(16) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    receipt_number VARCHAR(100) NOT NULL,
    recorded_by_account_id BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_fine_payment PRIMARY KEY (id),
    CONSTRAINT fk_fine_payment_fine FOREIGN KEY (fine_id) REFERENCES fine(id) ON DELETE CASCADE,
    CONSTRAINT fk_fine_payment_librarian FOREIGN KEY (recorded_by_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_fine_payment_fine ON fine_payment (fine_id);

-- 4. Create due_date_reminder_log table
CREATE TABLE due_date_reminder_log (
    id BINARY(16) NOT NULL,
    loan_id BINARY(16) NOT NULL,
    due_date DATE NOT NULL,
    reminder_type VARCHAR(30) NOT NULL,
    sent_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_due_date_reminder_log PRIMARY KEY (id),
    CONSTRAINT uq_loan_due_reminder UNIQUE (loan_id, due_date, reminder_type),
    CONSTRAINT fk_reminder_loan FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX ix_reminder_loan_due ON due_date_reminder_log (loan_id, due_date);

-- 5. Seed default system settings for circulation and fines
INSERT INTO system_setting (setting_key, setting_value) VALUES
('loan.standard.period.days', '21'),
('loan.renewal.extension.days', '21'),
('fine.daily.rate', '10'),
('fine.max.limit', '500'),
('fine.grace.period.days', '0')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
