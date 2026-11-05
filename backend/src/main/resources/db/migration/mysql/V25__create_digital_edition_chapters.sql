CREATE TABLE digital_edition_chapter (
    id BINARY(16) NOT NULL,
    digital_edition_id BINARY(16) NOT NULL,
    chapter_number INT,
    title VARCHAR(255) NOT NULL,
    start_page INT NOT NULL,
    end_page INT NOT NULL,
    content MEDIUMTEXT,
    is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_digital_edition_chapter PRIMARY KEY (id),
    CONSTRAINT fk_chapter_digital_edition FOREIGN KEY (digital_edition_id) REFERENCES digital_edition (id) ON DELETE CASCADE,
    CONSTRAINT ck_chapter_start_page CHECK (start_page >= 1),
    CONSTRAINT ck_chapter_page_range CHECK (end_page >= start_page),
    CONSTRAINT ck_chapter_title_nonblank CHECK (CHAR_LENGTH(TRIM(title)) > 0)
) ENGINE=InnoDB;

CREATE INDEX ix_chapter_digital_edition ON digital_edition_chapter (digital_edition_id, start_page);
CREATE INDEX ix_chapter_edition_number ON digital_edition_chapter (digital_edition_id, chapter_number);
CREATE FULLTEXT INDEX ft_chapter_search ON digital_edition_chapter (title, content);
