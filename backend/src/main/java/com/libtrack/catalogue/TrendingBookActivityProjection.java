package com.libtrack.catalogue;

import java.util.UUID;

/** Aggregate activity for one catalogue title, without exposing member data. */
public interface TrendingBookActivityProjection {
    UUID getBookId();
    long getActivityCount();
}
