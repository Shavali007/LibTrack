-- V22: Enhance app_notification table with rich metadata, entity linkage, dedup key, and read timestamp (MySQL)

ALTER TABLE app_notification
    ADD COLUMN full_message TEXT NULL,
    ADD COLUMN related_entity_type VARCHAR(50) NULL,
    ADD COLUMN related_entity_id BINARY(16) NULL,
    ADD COLUMN action_route VARCHAR(255) NULL,
    ADD COLUMN dedup_key VARCHAR(150) NULL,
    ADD COLUMN read_at DATETIME(6) NULL;

CREATE INDEX ix_app_notification_recipient_status_created ON app_notification (recipient_account_id, is_read, created_at DESC);
CREATE INDEX ix_app_notification_dedup ON app_notification (dedup_key);
