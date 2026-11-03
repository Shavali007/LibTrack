-- V21: Holiday Calendar Redesign: Support date ranges for library holidays

ALTER TABLE library_holiday
    ADD COLUMN from_date DATE;

ALTER TABLE library_holiday
    ADD COLUMN to_date DATE;

UPDATE library_holiday
SET from_date = holiday_date,
    to_date = holiday_date
WHERE from_date IS NULL;

ALTER TABLE library_holiday
    ALTER COLUMN from_date SET NOT NULL;

ALTER TABLE library_holiday
    ALTER COLUMN to_date SET NOT NULL;

ALTER TABLE library_holiday
    DROP CONSTRAINT IF EXISTS uq_library_holiday_date;

ALTER TABLE library_holiday
    DROP COLUMN holiday_date;

ALTER TABLE library_holiday
    ADD CONSTRAINT ck_library_holiday_range CHECK (to_date >= from_date);

CREATE INDEX ix_library_holiday_range ON library_holiday (from_date, to_date);
