-- V22: Enhance app_notification table with rich metadata, entity linkage, dedup key, and read timestamp

ALTER TABLE app_notification
    ADD COLUMN full_message TEXT,
    ADD COLUMN related_entity_type VARCHAR(50),
    ADD COLUMN related_entity_id UUID,
    ADD COLUMN action_route VARCHAR(255),
    ADD COLUMN dedup_key VARCHAR(150),
    ADD COLUMN read_at TIMESTAMPTZ;

CREATE INDEX ix_app_notification_recipient_status_created ON app_notification (recipient_account_id, is_read, created_at DESC);
CREATE INDEX ix_app_notification_dedup ON app_notification (dedup_key);
