CREATE TABLE student_interest (
    id BINARY(16) NOT NULL,
    student_account_id BINARY(16) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_student_interest PRIMARY KEY (id),
    CONSTRAINT uq_student_interest_category UNIQUE (student_account_id, category_name),
    CONSTRAINT fk_student_interest_student FOREIGN KEY (student_account_id) REFERENCES user_account (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX ix_student_interest_student ON student_interest (student_account_id);
