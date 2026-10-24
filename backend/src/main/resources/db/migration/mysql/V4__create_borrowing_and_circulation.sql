CREATE TABLE borrow_request (
    id BINARY(16) NOT NULL,
    borrower_account_id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    decided_at DATETIME(6),
    decided_by_account_id BINARY(16),
    decision_reason VARCHAR(1000),
    CONSTRAINT pk_borrow_request PRIMARY KEY (id),
    CONSTRAINT ck_borrow_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED')),
    CONSTRAINT ck_borrow_request_decision CHECK (
        (status = 'PENDING' AND decided_at IS NULL AND decided_by_account_id IS NULL)
        OR (status <> 'PENDING' AND decided_at IS NOT NULL AND decided_by_account_id IS NOT NULL)
    ),
    CONSTRAINT fk_borrow_request_borrower FOREIGN KEY (borrower_account_id) REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT fk_borrow_request_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE RESTRICT,
    CONSTRAINT fk_borrow_request_decided_by FOREIGN KEY (decided_by_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX ix_borrow_request_status_submitted ON borrow_request(status, submitted_at);
CREATE INDEX ix_borrow_request_borrower_submitted ON borrow_request(borrower_account_id, submitted_at DESC);
CREATE INDEX ix_borrow_request_book ON borrow_request(book_id);

CREATE TABLE borrow_request_event (
    id BINARY(16) NOT NULL,
    borrow_request_id BINARY(16) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    actor_account_id BINARY(16) NOT NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reason VARCHAR(1000),
    CONSTRAINT pk_borrow_request_event PRIMARY KEY (id),
    CONSTRAINT ck_borrow_request_event_type CHECK (event_type IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED')),
    CONSTRAINT fk_borrow_request_event_request FOREIGN KEY (borrow_request_id) REFERENCES borrow_request(id) ON DELETE RESTRICT,
    CONSTRAINT fk_borrow_request_event_actor FOREIGN KEY (actor_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX ix_borrow_request_event_request ON borrow_request_event(borrow_request_id, occurred_at);

CREATE TABLE loan (
    id BINARY(16) NOT NULL,
    borrow_request_id BINARY(16) NOT NULL,
    book_copy_id BINARY(16) NOT NULL,
    borrower_account_id BINARY(16) NOT NULL,
    issued_by_account_id BINARY(16) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    actual_return_date DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    renewal_count SMALLINT NOT NULL DEFAULT 0,
    return_note VARCHAR(1000),
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    active_copy_id BINARY(16)
        GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN book_copy_id ELSE NULL END) STORED,
    CONSTRAINT pk_loan PRIMARY KEY (id),
    CONSTRAINT uq_loan_borrow_request UNIQUE (borrow_request_id),
    CONSTRAINT ck_loan_due_after_issue CHECK (due_date >= issue_date),
    CONSTRAINT ck_loan_renewal_count CHECK (renewal_count BETWEEN 0 AND 1),
    CONSTRAINT ck_loan_status CHECK (status IN ('ACTIVE', 'RETURNED', 'LOST')),
    CONSTRAINT ck_loan_return_state CHECK (
        (status = 'ACTIVE' AND actual_return_date IS NULL)
        OR (status = 'RETURNED' AND actual_return_date IS NOT NULL)
        OR (status = 'LOST' AND actual_return_date IS NULL)
    ),
    CONSTRAINT fk_loan_request FOREIGN KEY (borrow_request_id) REFERENCES borrow_request(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_copy FOREIGN KEY (book_copy_id) REFERENCES book_copy(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_borrower FOREIGN KEY (borrower_account_id) REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_issued_by FOREIGN KEY (issued_by_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE UNIQUE INDEX uq_loan_active_copy ON loan(active_copy_id);
CREATE INDEX ix_loan_borrower_issue ON loan(borrower_account_id, issue_date DESC);
CREATE INDEX ix_loan_status_due ON loan(status, due_date);

CREATE TABLE loan_event (
    id BINARY(16) NOT NULL,
    loan_id BINARY(16) NOT NULL,
    event_type VARCHAR(24) NOT NULL,
    actor_account_id BINARY(16) NOT NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    effective_date DATE NOT NULL,
    previous_due_date DATE,
    new_due_date DATE,
    copy_status VARCHAR(20),
    note VARCHAR(1000),
    CONSTRAINT pk_loan_event PRIMARY KEY (id),
    CONSTRAINT ck_loan_event_type CHECK (event_type IN ('ISSUED', 'RENEWED', 'RETURNED_GOOD', 'RETURNED_DAMAGED', 'REPORTED_LOST')),
    CONSTRAINT fk_loan_event_loan FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_event_actor FOREIGN KEY (actor_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE INDEX ix_loan_event_loan ON loan_event(loan_id, occurred_at);

CREATE TABLE library_holiday (
    id BINARY(16) NOT NULL,
    holiday_date DATE NOT NULL,
    name VARCHAR(160) NOT NULL,
    created_by_account_id BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_library_holiday PRIMARY KEY (id),
    CONSTRAINT uq_library_holiday_date UNIQUE (holiday_date),
    CONSTRAINT ck_library_holiday_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
    CONSTRAINT fk_library_holiday_created_by FOREIGN KEY (created_by_account_id) REFERENCES user_account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
