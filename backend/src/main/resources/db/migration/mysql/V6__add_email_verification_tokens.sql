CREATE TABLE email_verification_token (
 account_id BINARY(16) NOT NULL, token_hash CHAR(64) NOT NULL,
 expires_at DATETIME(6) NOT NULL, consumed_at DATETIME(6) NULL, created_at DATETIME(6) NOT NULL,
 CONSTRAINT pk_email_verification_token PRIMARY KEY (account_id),
 CONSTRAINT uq_email_verification_token_hash UNIQUE (token_hash),
 CONSTRAINT fk_email_verification_token_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB;
