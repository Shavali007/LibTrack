package com.libtrack.digital;

import java.util.List;

public record ChapterSearchResponse(
        String query,
        List<ChapterSearchResultItem> chapters,
        List<ChapterSearchResultItem> results,
        int totalChapters,
        int totalMatches,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public ChapterSearchResponse(
            String query,
            List<ChapterSearchResultItem> items,
            int totalChapters,
            int totalMatches,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
        this(query, items, items, totalChapters, totalMatches, page, size, totalElements, totalPages);
    }

    public ChapterSearchResponse(
            List<ChapterSearchResultItem> results,
            int totalChapters,
            int totalMatches,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
        this("", results, results, totalChapters, totalMatches, page, size, totalElements, totalPages);
    }
}
