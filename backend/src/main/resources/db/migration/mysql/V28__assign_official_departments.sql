-- V28: Assign official departments to existing students and faculty and enforce official department list

-- 1. Normalize any existing variations/abbreviations
UPDATE user_account
SET department = 'Computer Science and Engineering'
WHERE department IN ('CSE', 'Computer Science', 'Computer Science & Engineering');

UPDATE user_account
SET department = 'Electronics and Communication Engineering'
WHERE department IN ('ECE', 'Electronics & Communication Engineering', 'Electronics and Communication');

UPDATE user_account
SET department = 'Electrical and Electronics Engineering'
WHERE department IN ('EEE', 'Electrical & Electronics Engineering', 'Electrical and Electronics');

UPDATE user_account
SET department = 'Mechanical Engineering'
WHERE department IN ('ME', 'Mechanical');

-- 2. Distribute existing students and faculty who have null or unassigned departments across the 4 official departments
UPDATE user_account
SET department = CASE MOD(CRC32(email), 4)
    WHEN 0 THEN 'Computer Science and Engineering'
    WHEN 1 THEN 'Electronics and Communication Engineering'
    WHEN 2 THEN 'Electrical and Electronics Engineering'
    ELSE 'Mechanical Engineering'
END
WHERE role IN ('STUDENT', 'FACULTY')
  AND (
      department IS NULL
      OR TRIM(department) = ''
      OR department NOT IN (
          'Computer Science and Engineering',
          'Electronics and Communication Engineering',
          'Electrical and Electronics Engineering',
          'Mechanical Engineering'
      )
  );

-- 3. Ensure librarian accounts do not hold an academic department
UPDATE user_account
SET department = NULL
WHERE role = 'LIBRARIAN';

-- 4. Enforce official department values via check constraint
ALTER TABLE user_account
    ADD CONSTRAINT ck_user_account_department
    CHECK (
        department IS NULL
        OR department IN (
            'Computer Science and Engineering',
            'Electronics and Communication Engineering',
            'Electrical and Electronics Engineering',
            'Mechanical Engineering'
        )
    );
