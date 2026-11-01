-- V17: Book Reservations Module
CREATE TABLE book_reservation (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    student_account_id BINARY(16) NOT NULL,
    assigned_copy_id BINARY(16) NULL,
    borrow_request_id BINARY(16) NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    hold_started_at DATETIME(6) NULL,
    hold_expires_at DATETIME(6) NULL,
    completed_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    expired_at DATETIME(6) NULL,
    CONSTRAINT pk_book_reservation PRIMARY KEY (id),
    CONSTRAINT fk_book_reservation_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_reservation_student FOREIGN KEY (student_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_reservation_copy FOREIGN KEY (assigned_copy_id) REFERENCES book_copy (id) ON DELETE SET NULL,
    CONSTRAINT fk_book_reservation_request FOREIGN KEY (borrow_request_id) REFERENCES borrow_request (id) ON DELETE SET NULL,
    CONSTRAINT ck_book_reservation_status CHECK (status IN ('WAITING_FOR_AVAILABILITY', 'IN_QUEUE', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_book_reservation_book_status ON book_reservation (book_id, status);
CREATE INDEX idx_book_reservation_student ON book_reservation (student_account_id);
CREATE INDEX idx_book_reservation_created ON book_reservation (created_at);
CREATE INDEX idx_book_reservation_copy ON book_reservation (assigned_copy_id);
CREATE INDEX idx_book_reservation_hold_expires ON book_reservation (status, hold_expires_at);
