package com.libtrack.wishlist;

import java.util.UUID;

public interface WishlistCategoryMatch {
    UUID getUserId();
    UUID getCategoryId();
    String getCategoryName();
}
