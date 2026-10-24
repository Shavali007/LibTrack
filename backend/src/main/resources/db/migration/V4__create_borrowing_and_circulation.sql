CREATE TABLE borrow_request (
    id UUID PRIMARY KEY,
    borrower_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    decided_by_account_id UUID REFERENCES user_account(id) ON DELETE RESTRICT,
    decision_reason VARCHAR(1000),
    CONSTRAINT ck_borrow_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED')),
    CONSTRAINT ck_borrow_request_decision CHECK (
        (status = 'PENDING' AND decided_at IS NULL AND decided_by_account_id IS NULL)
        OR (status <> 'PENDING' AND decided_at IS NOT NULL AND decided_by_account_id IS NOT NULL)
    )
);
CREATE INDEX ix_borrow_request_status_submitted ON borrow_request(status, submitted_at);
CREATE INDEX ix_borrow_request_borrower_submitted ON borrow_request(borrower_account_id, submitted_at DESC);
CREATE INDEX ix_borrow_request_book ON borrow_request(book_id);

CREATE TABLE borrow_request_event (
    id UUID PRIMARY KEY,
    borrow_request_id UUID NOT NULL REFERENCES borrow_request(id) ON DELETE RESTRICT,
    event_type VARCHAR(20) NOT NULL,
    actor_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason VARCHAR(1000),
    CONSTRAINT ck_borrow_request_event_type CHECK (event_type IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED'))
);
CREATE INDEX ix_borrow_request_event_request ON borrow_request_event(borrow_request_id, occurred_at);

CREATE TABLE loan (
    id UUID PRIMARY KEY,
    borrow_request_id UUID NOT NULL UNIQUE REFERENCES borrow_request(id) ON DELETE RESTRICT,
    book_copy_id UUID NOT NULL REFERENCES book_copy(id) ON DELETE RESTRICT,
    borrower_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    issued_by_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    actual_return_date DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    renewal_count SMALLINT NOT NULL DEFAULT 0,
    return_note VARCHAR(1000),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_loan_due_after_issue CHECK (due_date >= issue_date),
    CONSTRAINT ck_loan_renewal_count CHECK (renewal_count BETWEEN 0 AND 1),
    CONSTRAINT ck_loan_status CHECK (status IN ('ACTIVE', 'RETURNED', 'LOST')),
    CONSTRAINT ck_loan_return_state CHECK (
        (status = 'ACTIVE' AND actual_return_date IS NULL)
        OR (status = 'RETURNED' AND actual_return_date IS NOT NULL)
        OR (status = 'LOST' AND actual_return_date IS NULL)
    )
);
CREATE UNIQUE INDEX uq_loan_active_copy ON loan(book_copy_id) WHERE status = 'ACTIVE';
CREATE INDEX ix_loan_borrower_issue ON loan(borrower_account_id, issue_date DESC);
CREATE INDEX ix_loan_status_due ON loan(status, due_date);

CREATE TABLE loan_event (
    id UUID PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE RESTRICT,
    event_type VARCHAR(24) NOT NULL,
    actor_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_date DATE NOT NULL,
    previous_due_date DATE,
    new_due_date DATE,
    copy_status VARCHAR(20),
    note VARCHAR(1000),
    CONSTRAINT ck_loan_event_type CHECK (event_type IN ('ISSUED', 'RENEWED', 'RETURNED_GOOD', 'RETURNED_DAMAGED', 'REPORTED_LOST'))
);
CREATE INDEX ix_loan_event_loan ON loan_event(loan_id, occurred_at);

CREATE TABLE library_holiday (
    id UUID PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name VARCHAR(160) NOT NULL,
    created_by_account_id UUID NOT NULL REFERENCES user_account(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_library_holiday_date UNIQUE(holiday_date),
    CONSTRAINT ck_library_holiday_name CHECK (length(btrim(name)) > 0)
);
