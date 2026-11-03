-- V21: Holiday Calendar Redesign: Support date ranges for library holidays

ALTER TABLE library_holiday
    ADD COLUMN from_date DATE NULL AFTER id,
    ADD COLUMN to_date DATE NULL AFTER from_date;

UPDATE library_holiday
SET from_date = holiday_date,
    to_date = holiday_date
WHERE from_date IS NULL;

ALTER TABLE library_holiday
    MODIFY COLUMN from_date DATE NOT NULL,
    MODIFY COLUMN to_date DATE NOT NULL;

ALTER TABLE library_holiday
    DROP INDEX uq_library_holiday_date;

ALTER TABLE library_holiday
    DROP COLUMN holiday_date;

ALTER TABLE library_holiday
    ADD CONSTRAINT ck_library_holiday_range CHECK (to_date >= from_date);

CREATE INDEX ix_library_holiday_range ON library_holiday (from_date, to_date);
