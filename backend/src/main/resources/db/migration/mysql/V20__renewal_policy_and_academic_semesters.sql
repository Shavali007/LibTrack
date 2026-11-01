-- V20: Fix renewal policy and introduce academic semesters with semester renewal tracking

-- 1. Correct renewal extension days to 21
UPDATE system_setting
SET setting_value = '21'
WHERE setting_key = 'loan.renewal.extension.days';

-- 2. Create academic_semester table
CREATE TABLE academic_semester (
    id BINARY(16) NOT NULL,
    semester_code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_academic_semester PRIMARY KEY (id),
    CONSTRAINT uq_academic_semester_code UNIQUE (semester_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed initial semester boundaries (2025 - 2027)
INSERT INTO academic_semester (id, semester_code, name, start_date, end_date, created_at)
VALUES
    (UNHEX(REPLACE(UUID(), '-', '')), 'SPRING-2025', 'Spring 2025', '2025-01-01', '2025-06-30', NOW(6)),
    (UNHEX(REPLACE(UUID(), '-', '')), 'FALL-2025', 'Fall 2025', '2025-07-01', '2025-12-31', NOW(6)),
    (UNHEX(REPLACE(UUID(), '-', '')), 'SPRING-2026', 'Spring 2026', '2026-01-01', '2026-06-30', NOW(6)),
    (UNHEX(REPLACE(UUID(), '-', '')), 'FALL-2026', 'Fall 2026', '2026-07-01', '2026-12-31', NOW(6)),
    (UNHEX(REPLACE(UUID(), '-', '')), 'SPRING-2027', 'Spring 2027', '2027-01-01', '2027-06-30', NOW(6)),
    (UNHEX(REPLACE(UUID(), '-', '')), 'FALL-2027', 'Fall 2027', '2027-07-01', '2027-12-31', NOW(6));

-- 4. Create user_semester_renewal table to track renewal usage per user per semester
CREATE TABLE user_semester_renewal (
    id BINARY(16) NOT NULL,
    user_id BINARY(16) NOT NULL,
    semester_code VARCHAR(32) NOT NULL,
    loan_id BINARY(16) NOT NULL,
    renewed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_user_semester_renewal PRIMARY KEY (id),
    CONSTRAINT uq_user_semester_renewal UNIQUE (user_id, semester_code),
    CONSTRAINT fk_usr_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_usr_loan FOREIGN KEY (loan_id) REFERENCES loan (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_usr_user ON user_semester_renewal (user_id);
