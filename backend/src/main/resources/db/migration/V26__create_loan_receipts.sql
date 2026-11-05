CREATE TABLE loan_receipt (
    id BINARY(16) NOT NULL,
    loan_id BINARY(16) NOT NULL,
    receipt_number VARCHAR(64) NOT NULL,
    issued_by_id BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_loan_receipt PRIMARY KEY (id),
    CONSTRAINT uq_loan_receipt_loan UNIQUE (loan_id),
    CONSTRAINT uq_loan_receipt_number UNIQUE (receipt_number),
    CONSTRAINT fk_loan_receipt_loan FOREIGN KEY (loan_id) REFERENCES loan (id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_receipt_issued_by FOREIGN KEY (issued_by_id) REFERENCES user_account (id) ON DELETE RESTRICT
);

CREATE INDEX ix_loan_receipt_issued_by ON loan_receipt (issued_by_id);
