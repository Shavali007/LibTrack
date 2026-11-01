ALTER TABLE user_account
    ADD COLUMN approval_status VARCHAR(25) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN rejection_reason VARCHAR(255) NULL,
    ADD COLUMN librarian_remarks TEXT NULL,
    ADD COLUMN reviewed_by_account_id BINARY(16) NULL,
    ADD COLUMN reviewed_at DATETIME(6) NULL;

ALTER TABLE user_account
    ADD CONSTRAINT fk_user_account_reviewed_by
        FOREIGN KEY (reviewed_by_account_id) REFERENCES user_account (id) ON DELETE SET NULL;

UPDATE user_account
SET approval_status = 'PENDING_APPROVAL'
WHERE provisioning_source = 'SELF_REGISTRATION'
  AND enabled = b'0'
  AND identity_verified_at IS NULL;

ALTER TABLE user_account
    DROP CHECK ck_user_account_provisioning_audit;

ALTER TABLE user_account
    ADD CONSTRAINT ck_user_account_provisioning_audit
        CHECK (
            provisioning_source = 'LEGACY'
            OR (
                role = 'LIBRARIAN'
                AND provisioning_source IN ('BOOTSTRAP', 'ADMINISTRATIVE')
                AND identity_verified_at IS NULL
                AND created_by_account_id IS NULL
            )
            OR (
                role IN ('STUDENT', 'FACULTY')
                AND provisioning_source = 'LIBRARIAN'
                AND institutional_id IS NOT NULL
                AND CHAR_LENGTH(TRIM(institutional_id)) > 0
                AND identity_verified_at IS NOT NULL
                AND created_by_account_id IS NOT NULL
            )
            OR (
                role IN ('STUDENT', 'FACULTY')
                AND provisioning_source = 'SELF_REGISTRATION'
                AND created_by_account_id IS NULL
            )
        );

CREATE TABLE member_approval_audit (
    id BINARY(16) NOT NULL PRIMARY KEY,
    account_id BINARY(16) NOT NULL,
    decision VARCHAR(25) NOT NULL,
    reviewed_by_account_id BINARY(16) NULL,
    reviewed_at DATETIME(6) NOT NULL,
    rejection_reason VARCHAR(255) NULL,
    remarks TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_member_approval_audit_account FOREIGN KEY (account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_member_approval_audit_reviewer FOREIGN KEY (reviewed_by_account_id) REFERENCES user_account (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_member_approval_audit_account ON member_approval_audit (account_id);
CREATE INDEX idx_member_approval_audit_reviewed_at ON member_approval_audit (reviewed_at);
