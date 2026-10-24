CREATE TABLE author (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    normalized_name VARCHAR(160) NOT NULL,
    CONSTRAINT uq_author_normalized_name UNIQUE (normalized_name),
    CONSTRAINT ck_author_name_nonblank CHECK (length(btrim(name)) > 0)
);

CREATE TABLE category (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_category_normalized_name UNIQUE (normalized_name),
    CONSTRAINT ck_category_name_nonblank CHECK (length(btrim(name)) > 0)
);

CREATE TABLE book (
    id UUID PRIMARY KEY,
    title VARCHAR(240) NOT NULL,
    isbn VARCHAR(13),
    description VARCHAR(4000),
    publisher VARCHAR(200),
    publication_year INTEGER,
    cover_image_url VARCHAR(2048),
    circulation_policy VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_book_isbn UNIQUE (isbn),
    CONSTRAINT ck_book_title_nonblank CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_book_isbn_format CHECK (isbn IS NULL OR isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
    CONSTRAINT ck_book_publication_year CHECK (publication_year IS NULL OR publication_year >= 1000),
    CONSTRAINT ck_book_circulation_policy CHECK (circulation_policy IN ('STANDARD', 'REFERENCE_ONLY', 'SERIAL_RESTRICTED', 'APPROVED_OVERNIGHT_EXCEPTION'))
);

CREATE TABLE book_author (
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES author(id) ON DELETE RESTRICT,
    CONSTRAINT pk_book_author PRIMARY KEY (book_id, author_id)
);

CREATE TABLE book_category (
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
    CONSTRAINT pk_book_category PRIMARY KEY (book_id, category_id)
);

CREATE TABLE book_copy (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE RESTRICT,
    copy_identifier VARCHAR(100) NOT NULL,
    location VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_book_copy_identifier UNIQUE (copy_identifier),
    CONSTRAINT ck_book_copy_identifier_normalized CHECK (copy_identifier = upper(btrim(copy_identifier))),
    CONSTRAINT ck_book_copy_identifier_nonblank CHECK (length(btrim(copy_identifier)) >= 2),
    CONSTRAINT ck_book_copy_status CHECK (status IN ('AVAILABLE', 'ON_LOAN', 'LOST', 'DAMAGED', 'WITHDRAWN'))
);

CREATE INDEX ix_book_active_title ON book (lower(title)) WHERE active = TRUE;
CREATE INDEX ix_book_author_author ON book_author (author_id, book_id);
CREATE INDEX ix_book_category_category ON book_category (category_id, book_id);
CREATE INDEX ix_book_copy_book_status ON book_copy (book_id, status);

