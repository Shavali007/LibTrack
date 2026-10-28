package com.libtrack.catalogue;

import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Generates globally unique identifiers that fit the existing copy identifier rules. */
@Component
public class CopyIdentifierGenerator {
    public String generate() {
        return UUID.randomUUID().toString().toUpperCase(Locale.ROOT);
    }
}
