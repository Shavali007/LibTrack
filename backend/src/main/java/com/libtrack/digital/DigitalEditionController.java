package com.libtrack.digital;

import com.libtrack.auth.AccountUserDetails;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@Validated
public class DigitalEditionController {

    private final DigitalEditionService digitalEditionService;

    public DigitalEditionController(DigitalEditionService digitalEditionService) {
        this.digitalEditionService = digitalEditionService;
    }

    @GetMapping("/books/{bookId}/digital-edition")
    public DigitalEditionResponse getDigitalEdition(@PathVariable UUID bookId) {
        return digitalEditionService.getEdition(bookId);
    }

    @PostMapping("/books/{bookId}/digital-edition")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<DigitalEditionResponse> uploadDigitalEdition(
            @PathVariable UUID bookId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "editionLabel", required = false) String editionLabel,
            Authentication authentication) {
        UUID uploaderId = extractUserId(authentication);
        DigitalEditionResponse response = digitalEditionService.uploadOrReplace(bookId, file, editionLabel, uploaderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/books/{bookId}/digital-edition")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<DigitalEditionResponse> replaceDigitalEdition(
            @PathVariable UUID bookId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "editionLabel", required = false) String editionLabel,
            Authentication authentication) {
        UUID uploaderId = extractUserId(authentication);
        DigitalEditionResponse response = digitalEditionService.uploadOrReplace(bookId, file, editionLabel, uploaderId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/books/{bookId}/digital-edition")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> removeDigitalEdition(@PathVariable UUID bookId) {
        digitalEditionService.removeEdition(bookId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/books/{bookId}/digital-edition/content")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<Resource> readInline(
            @PathVariable UUID bookId,
            Authentication authentication) {
        boolean librarian = authentication != null && authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LIBRARIAN"));
        DigitalEditionService.DigitalFileDownload download = digitalEditionService.loadContent(bookId, librarian);
        String safeFilename = download.filename().replaceAll("[\\r\\n\"]", "_");

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(download.fileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeFilename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache, no-store, must-revalidate")
                .header("X-Content-Type-Options", "nosniff")
                .body(download.resource());
    }

    @GetMapping("/books/{bookId}/digital-edition/download")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable UUID bookId,
            Authentication authentication) {
        boolean librarian = authentication != null && authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LIBRARIAN"));
        DigitalEditionService.DigitalFileDownload download = digitalEditionService.loadContent(bookId, librarian);
        String safeFilename = download.filename().replaceAll("[\\r\\n\"]", "_");

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(download.fileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFilename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache, no-store, must-revalidate")
                .header("X-Content-Type-Options", "nosniff")
                .body(download.resource());
    }

    private static UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AccountUserDetails aud) {
            return aud.getId();
        }
        return null;
    }
}
