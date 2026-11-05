package com.libtrack.catalogue;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, long bookCount) {
    public CategoryResponse(UUID id, String name) { this(id, name, 0); }
}
