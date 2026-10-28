package com.libtrack.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class EmailVerificationMigrationTest {
    @Test void v7ReplacesThePendingOnlyCheckWithoutChangingOtherProvisioningRules() throws Exception {
        String migration;
        try (var stream = getClass().getClassLoader().getResourceAsStream("db/migration/mysql/V7__allow_verified_self_registration.sql")) {
            if (stream == null) throw new AssertionError("V7 migration was not packaged on the test classpath");
            migration = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        assertTrue(migration.contains("DROP CHECK ck_user_account_provisioning_audit"));
        assertTrue(migration.contains("ADD CONSTRAINT ck_user_account_provisioning_audit"));
        assertTrue(migration.contains("provisioning_source = 'SELF_REGISTRATION'"));
        assertFalse(migration.contains("enabled = b'0'"));
        assertTrue(migration.contains("created_by_account_id IS NULL"));
        assertTrue(migration.contains("institutional_id IS NULL"));
    }
}
