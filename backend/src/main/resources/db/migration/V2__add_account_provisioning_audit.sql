ALTER TABLE user_account
    ADD COLUMN institutional_id VARCHAR(100),
    ADD COLUMN identity_verified_at TIMESTAMPTZ,
    ADD COLUMN created_by_account_id UUID,
    ADD COLUMN provisioning_source VARCHAR(24) NOT NULL DEFAULT 'LEGACY';

ALTER TABLE user_account
    ADD CONSTRAINT fk_user_account_provisioned_by
        FOREIGN KEY (created_by_account_id) REFERENCES user_account(id) ON DELETE RESTRICT,
    ADD CONSTRAINT ck_user_account_provisioning_source
        CHECK (provisioning_source IN ('LIBRARIAN', 'BOOTSTRAP', 'ADMINISTRATIVE', 'LEGACY')),
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
                AND length(btrim(institutional_id)) > 0
                AND identity_verified_at IS NOT NULL
                AND created_by_account_id IS NOT NULL
            )
        );

CREATE UNIQUE INDEX uq_user_account_institutional_id
    ON user_account (institutional_id)
    WHERE institutional_id IS NOT NULL;

-- Prevent concurrent one-time bootstrap invocations from creating duplicate initial administrators.
CREATE UNIQUE INDEX uq_single_bootstrap_librarian
    ON user_account (provisioning_source)
    WHERE role = 'LIBRARIAN' AND provisioning_source = 'BOOTSTRAP';
