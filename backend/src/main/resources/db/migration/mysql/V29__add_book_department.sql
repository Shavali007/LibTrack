-- V29: Add department classification to books and enforce official department list

-- 1. Add department column to book
ALTER TABLE book ADD COLUMN department VARCHAR(100) NULL;

-- 2. Classify existing books safely using title and subject keywords
UPDATE book
SET department = CASE
    WHEN LOWER(title) LIKE '%c++%'
      OR LOWER(title) LIKE '%python%'
      OR LOWER(title) LIKE '%java%'
      OR LOWER(title) LIKE '%code%'
      OR LOWER(title) LIKE '%program%'
      OR LOWER(title) LIKE '%software%'
      OR LOWER(title) LIKE '%algorithm%'
      OR LOWER(title) LIKE '%computer%'
      OR LOWER(title) LIKE '%network%'
      OR LOWER(title) LIKE '%database%' THEN 'Computer Science and Engineering'
    WHEN LOWER(title) LIKE '%physical%'
      OR LOWER(title) LIKE '%electronic%'
      OR LOWER(title) LIKE '%communication%'
      OR LOWER(title) LIKE '%signal%'
      OR LOWER(title) LIKE '%vlsi%'
      OR LOWER(title) LIKE '%telecom%' THEN 'Electronics and Communication Engineering'
    WHEN LOWER(title) LIKE '%environment%'
      OR LOWER(title) LIKE '%electric%'
      OR LOWER(title) LIKE '%power%'
      OR LOWER(title) LIKE '%circuit%'
      OR LOWER(title) LIKE '%energy%' THEN 'Electrical and Electronics Engineering'
    WHEN LOWER(title) LIKE '%chemistry%'
      OR LOWER(title) LIKE '%mechanical%'
      OR LOWER(title) LIKE '%thermo%'
      OR LOWER(title) LIKE '%fluid%'
      OR LOWER(title) LIKE '%mechanic%'
      OR LOWER(title) LIKE '%manufactur%' THEN 'Mechanical Engineering'
    ELSE 'Computer Science and Engineering'
END
WHERE department IS NULL;

-- 3. Enforce official department values via check constraint
ALTER TABLE book
    ADD CONSTRAINT ck_book_department
    CHECK (
        department IS NULL
        OR department IN (
            'Computer Science and Engineering',
            'Electronics and Communication Engineering',
            'Electrical and Electronics Engineering',
            'Mechanical Engineering'
        )
    );
