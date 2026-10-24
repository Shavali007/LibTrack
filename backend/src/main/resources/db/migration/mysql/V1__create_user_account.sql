CREATE TABLE user_account (
    id BINARY(16) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    enabled BIT(1) NOT NULL DEFAULT b'1',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uq_user_account_email UNIQUE (email),
    CONSTRAINT ck_user_account_email_normalized CHECK (BINARY email = BINARY LOWER(TRIM(email))),
    CONSTRAINT ck_user_account_role CHECK (role IN ('STUDENT', 'FACULTY', 'LIBRARIAN'))
) ENGINE=InnoDB;
