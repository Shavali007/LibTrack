-- V16: Book Reviews and Digital Edition Access Tracking

CREATE TABLE digital_edition_access (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    user_account_id BINARY(16) NOT NULL,
    access_type VARCHAR(20) NOT NULL,
    accessed_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_digital_edition_access PRIMARY KEY (id),
    CONSTRAINT fk_digital_access_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    CONSTRAINT fk_digital_access_user FOREIGN KEY (user_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT ck_digital_access_type CHECK (access_type IN ('READ_ONLINE', 'DOWNLOAD'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_digital_access_user_book ON digital_edition_access (user_account_id, book_id);
CREATE INDEX idx_digital_access_book ON digital_edition_access (book_id);

CREATE TABLE book_review (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    user_account_id BINARY(16) NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(1000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_book_review PRIMARY KEY (id),
    CONSTRAINT fk_book_review_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_review_user FOREIGN KEY (user_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT ck_book_review_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT uq_book_review_user UNIQUE (book_id, user_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_book_review_book_created ON book_review (book_id, created_at);
CREATE INDEX idx_book_review_user ON book_review (user_account_id);
