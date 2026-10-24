CREATE TABLE user_account (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_account_email UNIQUE (email),
    CONSTRAINT ck_user_account_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT ck_user_account_role CHECK (role IN ('STUDENT', 'FACULTY', 'LIBRARIAN'))
);
