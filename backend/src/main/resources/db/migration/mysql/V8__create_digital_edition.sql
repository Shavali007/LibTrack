CREATE TABLE digital_edition (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    storage_key VARCHAR(120) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL,
    edition_label VARCHAR(100),
    uploaded_by_account_id BINARY(16),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_digital_edition PRIMARY KEY (id),
    CONSTRAINT uq_digital_edition_book UNIQUE (book_id),
    CONSTRAINT uq_digital_edition_storage_key UNIQUE (storage_key),
    CONSTRAINT fk_digital_edition_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    CONSTRAINT fk_digital_edition_uploader FOREIGN KEY (uploaded_by_account_id) REFERENCES user_account(id) ON DELETE SET NULL,
    CONSTRAINT ck_digital_edition_file_size CHECK (file_size > 0),
    CONSTRAINT ck_digital_edition_filename_nonblank CHECK (CHAR_LENGTH(TRIM(original_filename)) > 0)
) ENGINE=InnoDB;

CREATE INDEX ix_digital_edition_book ON digital_edition (book_id);
