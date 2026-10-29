CREATE TABLE digital_edition (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    storage_key VARCHAR(120) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL,
    edition_label VARCHAR(100),
    uploaded_by_account_id UUID REFERENCES user_account(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_digital_edition_book UNIQUE (book_id),
    CONSTRAINT uq_digital_edition_storage_key UNIQUE (storage_key),
    CONSTRAINT ck_digital_edition_file_size CHECK (file_size > 0),
    CONSTRAINT ck_digital_edition_filename_nonblank CHECK (length(btrim(original_filename)) > 0)
);

CREATE INDEX ix_digital_edition_book ON digital_edition (book_id);
