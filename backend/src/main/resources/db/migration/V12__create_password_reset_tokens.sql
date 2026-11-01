CREATE TABLE password_reset_token (
    id BINARY(16) NOT NULL,
    account_id BINARY(16) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_password_reset_token PRIMARY KEY (id),
    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_token_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_password_reset_token_account ON password_reset_token(account_id);
CREATE INDEX idx_password_reset_token_expires ON password_reset_token(expires_at);
