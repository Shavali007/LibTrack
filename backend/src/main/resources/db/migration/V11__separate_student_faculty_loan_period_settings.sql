-- V11: Separate Student and Faculty loan duration settings

-- 1. Ensure loan.period.student.days defaults to 21
UPDATE system_setting
SET setting_value = '21'
WHERE setting_key = 'loan.period.student.days' AND setting_value = '14';

INSERT INTO system_setting (setting_key, setting_value)
VALUES ('loan.period.student.days', '21')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- 2. Ensure loan.period.faculty.days defaults to 30
INSERT INTO system_setting (setting_key, setting_value)
VALUES ('loan.period.faculty.days', '30')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- 3. Delete obsolete common setting
DELETE FROM system_setting
WHERE setting_key = 'loan.standard.period.days';
