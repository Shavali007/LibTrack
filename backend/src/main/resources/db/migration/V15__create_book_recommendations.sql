-- V15: Faculty Book Recommendations and Helpful Reactions

ALTER TABLE user_account
    ADD COLUMN department VARCHAR(100) NULL;

CREATE TABLE book_recommendation (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    faculty_account_id BINARY(16) NOT NULL,
    message VARCHAR(300) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    withdrawn_at DATETIME(6) NULL,
    CONSTRAINT pk_book_recommendation PRIMARY KEY (id),
    CONSTRAINT fk_book_recommendation_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_recommendation_faculty FOREIGN KEY (faculty_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT ck_book_recommendation_status CHECK (status IN ('ACTIVE', 'WITHDRAWN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_book_recommendation_book ON book_recommendation (book_id);
CREATE INDEX idx_book_recommendation_faculty ON book_recommendation (faculty_account_id);
CREATE INDEX idx_book_recommendation_status ON book_recommendation (status);

CREATE TABLE book_recommendation_helpful (
    id BINARY(16) NOT NULL,
    recommendation_id BINARY(16) NOT NULL,
    student_account_id BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_book_recommendation_helpful PRIMARY KEY (id),
    CONSTRAINT fk_recommendation_helpful_rec FOREIGN KEY (recommendation_id) REFERENCES book_recommendation (id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_helpful_student FOREIGN KEY (student_account_id) REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT uq_recommendation_student UNIQUE (recommendation_id, student_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_rec_helpful_recommendation ON book_recommendation_helpful (recommendation_id);
CREATE INDEX idx_rec_helpful_student ON book_recommendation_helpful (student_account_id);
