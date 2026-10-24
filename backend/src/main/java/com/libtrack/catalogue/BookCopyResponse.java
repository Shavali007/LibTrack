package com.libtrack.catalogue;

import java.time.Instant;
import java.util.UUID;

public record BookCopyResponse(UUID id, UUID bookId, String copyIdentifier, String location, CopyStatus status, Instant createdAt, Instant updatedAt) {}
