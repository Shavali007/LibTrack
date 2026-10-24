CREATE TABLE author (
    id BINARY(16) NOT NULL,
    name VARCHAR(160) NOT NULL,
    normalized_name VARCHAR(160) NOT NULL,
    CONSTRAINT pk_author PRIMARY KEY (id),
    CONSTRAINT uq_author_normalized_name UNIQUE (normalized_name),
    CONSTRAINT ck_author_name_nonblank CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE category (
    id BINARY(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    CONSTRAINT pk_category PRIMARY KEY (id),
    CONSTRAINT uq_category_normalized_name UNIQUE (normalized_name),
    CONSTRAINT ck_category_name_nonblank CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE book (
    id BINARY(16) NOT NULL,
    title VARCHAR(240) NOT NULL,
    isbn VARCHAR(13),
    description VARCHAR(4000),
    publisher VARCHAR(200),
    publication_year INTEGER,
    cover_image_url VARCHAR(2048),
    circulation_policy VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    active BIT(1) NOT NULL DEFAULT b'1',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_book PRIMARY KEY (id),
    CONSTRAINT uq_book_isbn UNIQUE (isbn),
    CONSTRAINT ck_book_title_nonblank CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    CONSTRAINT ck_book_isbn_format CHECK (isbn IS NULL OR REGEXP_LIKE(isbn, '^([0-9]{9}[0-9X]|[0-9]{13})$')),
    CONSTRAINT ck_book_publication_year CHECK (publication_year IS NULL OR publication_year >= 1000),
    CONSTRAINT ck_book_circulation_policy CHECK (circulation_policy IN ('STANDARD', 'REFERENCE_ONLY', 'SERIAL_RESTRICTED', 'APPROVED_OVERNIGHT_EXCEPTION'))
) ENGINE=InnoDB;

CREATE TABLE book_author (
    book_id BINARY(16) NOT NULL,
    author_id BINARY(16) NOT NULL,
    CONSTRAINT pk_book_author PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_book_author_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_author_author FOREIGN KEY (author_id) REFERENCES author(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE book_category (
    book_id BINARY(16) NOT NULL,
    category_id BINARY(16) NOT NULL,
    CONSTRAINT pk_book_category PRIMARY KEY (book_id, category_id),
    CONSTRAINT fk_book_category_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_category_category FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE book_copy (
    id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    copy_identifier VARCHAR(100) NOT NULL,
    location VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_book_copy PRIMARY KEY (id),
    CONSTRAINT uq_book_copy_identifier UNIQUE (copy_identifier),
    CONSTRAINT ck_book_copy_identifier_normalized CHECK (BINARY copy_identifier = BINARY UPPER(TRIM(copy_identifier))),
    CONSTRAINT ck_book_copy_identifier_nonblank CHECK (CHAR_LENGTH(TRIM(copy_identifier)) >= 2),
    CONSTRAINT ck_book_copy_status CHECK (status IN ('AVAILABLE', 'ON_LOAN', 'LOST', 'DAMAGED', 'WITHDRAWN')),
    CONSTRAINT fk_book_copy_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_book_active_title ON book (active, title);
CREATE INDEX ix_book_author_author ON book_author (author_id, book_id);
CREATE INDEX ix_book_category_category ON book_category (category_id, book_id);
CREATE INDEX ix_book_copy_book_status ON book_copy (book_id, status);
