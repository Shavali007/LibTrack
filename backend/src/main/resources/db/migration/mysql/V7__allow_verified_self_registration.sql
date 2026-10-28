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
                AND institutional_id IS NULL
                AND identity_verified_at IS NULL
                AND created_by_account_id IS NULL
            )
        );
