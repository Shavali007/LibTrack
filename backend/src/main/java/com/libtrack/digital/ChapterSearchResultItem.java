package com.libtrack.digital;

import java.util.List;
import java.util.UUID;

public record ChapterSearchResultItem(
        UUID chapterId,
        Integer chapterNumber,
        String chapterTitle,
        int startPage,
        int endPage,
        boolean isManuallyEdited,
        int matchCount,
        List<ChapterSearchMatch> matches
) {
    public ChapterSearchResultItem(
            UUID chapterId,
            Integer chapterNumber,
            String chapterTitle,
            int startPage,
            int endPage,
            int matchCount,
            List<ChapterSearchMatch> matches
    ) {
        this(chapterId, chapterNumber, chapterTitle, startPage, endPage, false, matchCount, matches);
    }
}
