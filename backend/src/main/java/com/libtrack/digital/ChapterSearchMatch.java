package com.libtrack.digital;

public record ChapterSearchMatch(
        int pageNumber,
        String snippet,
        String headingTitle,
        String sectionContext
) {
    public ChapterSearchMatch(int pageNumber, String snippet) {
        this(pageNumber, snippet, snippet, null);
    }

    public ChapterSearchMatch(int pageNumber, String snippet, String headingTitle) {
        this(pageNumber, snippet, headingTitle, null);
    }
}
