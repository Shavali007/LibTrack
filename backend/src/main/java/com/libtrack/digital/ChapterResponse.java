package com.libtrack.digital;

import java.time.Instant;
import java.util.UUID;

public record ChapterResponse(
        UUID id,
        UUID digitalEditionId,
        Integer chapterNumber,
        String title,
        int startPage,
        int endPage,
        boolean manuallyEdited,
        Instant createdAt,
        Instant updatedAt
) {
    public static ChapterResponse from(DigitalEditionChapter chapter) {
        return new ChapterResponse(
                chapter.getId(),
                chapter.getDigitalEdition().getId(),
                chapter.getChapterNumber(),
                chapter.getTitle(),
                chapter.getStartPage(),
                chapter.getEndPage(),
                chapter.isManuallyEdited(),
                chapter.getCreatedAt(),
                chapter.getUpdatedAt()
        );
    }
}
