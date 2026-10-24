package com.libtrack.common.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class HealthControllerTest {
    @Test
    void healthEndpointReportsUp() {
        assertEquals("UP", new HealthController().health().get("status"));
    }
}
