-- Carry the previously configured Student loan term into the shared term.
-- Existing loan due dates and issue-time fine snapshots are not changed.
INSERT INTO system_setting (setting_key, setting_value, updated_at, updated_by_account_id)
SELECT 'loan.period.days',
       COALESCE((SELECT setting_value FROM system_setting WHERE setting_key = 'loan.period.student.days'), '21'),
       CURRENT_TIMESTAMP(6),
       NULL
FROM DUAL
ON DUPLICATE KEY UPDATE setting_key = 'loan.period.days';
