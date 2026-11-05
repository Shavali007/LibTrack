-- Align issue_date and effective_date with the library's local timezone (Asia/Kolkata, UTC+05:30)
-- for transactions where UTC date truncation caused the stored date to be one day behind the actual local issue date.

UPDATE loan 
SET issue_date = DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'))
WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) > issue_date
  AND due_date >= DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'));

UPDATE loan_event 
SET effective_date = DATE(CONVERT_TZ(occurred_at, '+00:00', '+05:30'))
WHERE event_type = 'ISSUED'
  AND DATE(CONVERT_TZ(occurred_at, '+00:00', '+05:30')) > effective_date;
