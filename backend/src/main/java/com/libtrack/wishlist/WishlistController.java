package com.libtrack.wishlist;

import com.libtrack.auth.AccountUserDetails;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wishlist")
@Validated
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @PostMapping("/{bookId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<WishlistResponse> addToWishlist(
            @PathVariable UUID bookId,
            Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        WishlistResponse response = wishlistService.addToWishlist(userId, bookId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{bookId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable UUID bookId,
            Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        wishlistService.removeFromWishlist(userId, bookId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<List<WishlistResponse>> getMyWishlist(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(wishlistService.getMyWishlist(userId));
    }

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY')")
    public ResponseEntity<Map<String, Boolean>> getWishlistStatus(
            @RequestParam(name = "bookIds", required = false) List<UUID> bookIds,
            Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(wishlistService.getWishlistStatus(userId, bookIds));
    }

    private static UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountUserDetails aud) {
            return aud.getId();
        }
        return null;
    }
}
