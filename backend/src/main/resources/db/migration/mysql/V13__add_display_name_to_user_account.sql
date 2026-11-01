ALTER TABLE user_account
    ADD COLUMN display_name VARCHAR(100) NULL;

UPDATE user_account
SET display_name = CASE
    WHEN email IS NOT NULL AND INSTR(email, '@') > 1 THEN
        CONCAT(
            UPPER(SUBSTRING(SUBSTRING_INDEX(SUBSTRING_INDEX(email, '@', 1), '.', 1), 1, 1)),
            LOWER(SUBSTRING(SUBSTRING_INDEX(SUBSTRING_INDEX(email, '@', 1), '.', 1), 2))
        )
    ELSE 'Member'
END
WHERE display_name IS NULL OR TRIM(display_name) = '';
