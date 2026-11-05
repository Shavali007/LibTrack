package com.libtrack.digital;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/books/{bookId}/chapters", "/api/v1/books/{bookId}/digital-edition/chapters"})
@Validated
public class DigitalEditionChapterController {

    private final DigitalEditionChapterService chapterService;

    public DigitalEditionChapterController(DigitalEditionChapterService chapterService) {
        this.chapterService = chapterService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public List<ChapterResponse> getChapters(@PathVariable UUID bookId) {
        return chapterService.getChaptersForBook(bookId);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('STUDENT', 'FACULTY', 'LIBRARIAN')")
    public ChapterSearchResponse searchChapters(
            @PathVariable UUID bookId,
            @RequestParam(value = "query", required = false, defaultValue = "") String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return chapterService.searchChapters(bookId, query, page, size);
    }

    @PostMapping
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<ChapterResponse> createChapter(
            @PathVariable UUID bookId,
            @Valid @RequestBody ChapterCreateRequest request) {
        ChapterResponse response = chapterService.createChapter(bookId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{chapterId}")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<ChapterResponse> updateChapter(
            @PathVariable UUID bookId,
            @PathVariable UUID chapterId,
            @Valid @RequestBody ChapterUpdateRequest request) {
        ChapterResponse response = chapterService.updateChapter(bookId, chapterId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{chapterId}")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<Void> deleteChapter(
            @PathVariable UUID bookId,
            @PathVariable UUID chapterId) {
        chapterService.deleteChapter(bookId, chapterId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reprocess")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<ChapterResponse>> reprocessChapters(
            @PathVariable UUID bookId,
            @RequestParam(value = "overwriteManual", defaultValue = "false") boolean overwriteManual) {
        List<ChapterResponse> response = chapterService.reprocessChapters(bookId, overwriteManual);
        return ResponseEntity.ok(response);
    }
}
