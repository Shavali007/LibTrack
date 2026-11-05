package com.libtrack.digital;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChapterCreateRequest(
        Integer chapterNumber,
        @NotBlank(message = "Chapter title is required")
        @Size(max = 255, message = "Chapter title cannot exceed 255 characters")
        String title,
        @Min(value = 1, message = "Start page must be at least 1")
        int startPage,
        @Min(value = 1, message = "End page must be at least 1")
        int endPage,
        String content
) {}
