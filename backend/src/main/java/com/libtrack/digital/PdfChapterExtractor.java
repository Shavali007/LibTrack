package com.libtrack.digital;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionGoTo;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDNamedDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDDocumentOutline;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineItem;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class PdfChapterExtractor {

    private static final Logger log = LoggerFactory.getLogger(PdfChapterExtractor.class);

    private static final Pattern CHAPTER_HEADING_PATTERN = Pattern.compile(
            "^\\s*(?:chapter|ch\\.?|unit|part|section)\\s+([0-9ivxlcdm]+)(?:[\\s:.-]+(.*))?",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern NUMBERED_SECTION_PATTERN = Pattern.compile(
            "^\\s*(\\d+)\\.\\s+([A-Z][A-Za-z0-9\\s,'\\-]{2,})",
            Pattern.CASE_INSENSITIVE
    );

    public record ExtractedChapter(
            Integer chapterNumber,
            String title,
            int startPage,
            int endPage,
            String content
    ) {}

    public record RawHeading(
            String title,
            int pageNumber,
            Integer chapterNumber,
            int depth,
            String parentTitle
    ) {}

    private record RawBookmark(
            String title,
            int pageNumber,
            Integer chapterNumber
    ) {}

    public List<ExtractedChapter> extractChapters(File pdfFile) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            return processDocument(document);
        }
    }

    public List<ExtractedChapter> extractChapters(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            return processDocument(document);
        }
    }

    public List<ExtractedChapter> extractChapters(InputStream inputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(new RandomAccessReadBuffer(inputStream))) {
            return processDocument(document);
        }
    }

    public List<RawHeading> extractAllHeadings(File pdfFile) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            return extractAllHeadings(document);
        }
    }

    public List<RawHeading> extractAllHeadings(PDDocument document) {
        List<RawHeading> list = new ArrayList<>();
        try {
            PDDocumentCatalog catalog = document.getDocumentCatalog();
            PDDocumentOutline outline = catalog.getDocumentOutline();
            if (outline != null && outline.children() != null) {
                for (PDOutlineItem item : outline.children()) {
                    traverseOutlineItemWithHierarchy(document, item, list, 0, null);
                }
            }
        } catch (Exception ex) {
            log.warn("Error extracting PDF bookmarks: {}", ex.getMessage());
        }
        return list;
    }

    public String extractPageRangeText(File pdfFile, int startPage, int endPage) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            return extractTextWithPageMarkers(document, startPage, endPage);
        }
    }

    public static List<RawHeading> parseHeadingsFromContent(String content, String defaultTitle, int defaultPage) {
        List<RawHeading> result = new ArrayList<>();
        if (content != null && content.contains("[Headings]")) {
            int start = content.indexOf("[Headings]");
            int end = content.indexOf("[/Headings]", start);
            if (end > start) {
                String block = content.substring(start + "[Headings]".length(), end).trim();
                String[] lines = block.split("\\r?\\n");
                for (String line : lines) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    int pipeIdx = trimmed.lastIndexOf("| page:");
                    if (pipeIdx > 0) {
                        String title = trimmed.substring(0, pipeIdx).trim();
                        try {
                            int page = Integer.parseInt(trimmed.substring(pipeIdx + 7).trim());
                            result.add(new RawHeading(title, page, null, 1, defaultTitle));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }
        if (result.isEmpty() && defaultTitle != null && !defaultTitle.isBlank()) {
            result.add(new RawHeading(defaultTitle.trim(), defaultPage, null, 0, null));
        }
        return result;
    }

    private List<ExtractedChapter> processDocument(PDDocument document) throws IOException {
        int totalPages = document.getNumberOfPages();
        if (totalPages <= 0) {
            return List.of();
        }

        List<RawHeading> allHeadings = extractAllHeadings(document);
        List<RawBookmark> candidates = new ArrayList<>();

        if (!allHeadings.isEmpty()) {
            // Find top-level chapter candidates (depth == 0 or explicit chapter number/title)
            for (RawHeading h : allHeadings) {
                if (h.depth() == 0 || h.chapterNumber() != null || isChapterTitle(h.title())) {
                    candidates.add(new RawBookmark(h.title(), h.pageNumber(), h.chapterNumber()));
                }
            }
        }

        if (candidates.isEmpty()) {
            candidates = detectChaptersFromText(document, totalPages);
        }

        if (candidates.isEmpty()) {
            candidates = List.of(new RawBookmark("Full Document", 1, 1));
        }

        // Deduplicate and ensure candidate order by startPage
        candidates = normalizeCandidates(candidates, totalPages);

        List<ExtractedChapter> chapters = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            RawBookmark current = candidates.get(i);
            int startPage = current.pageNumber();
            int endPage = (i + 1 < candidates.size())
                    ? Math.max(startPage, candidates.get(i + 1).pageNumber() - 1)
                    : totalPages;

            if (endPage > totalPages) {
                endPage = totalPages;
            }

            // Find all headings that belong to this chapter (itself + subheadings)
            List<RawHeading> chapterHeadings = new ArrayList<>();
            // Primary chapter title first
            chapterHeadings.add(new RawHeading(current.title(), startPage, current.chapterNumber(), 0, null));

            for (RawHeading h : allHeadings) {
                if (h.pageNumber() >= startPage && h.pageNumber() <= endPage) {
                    if (!h.title().equalsIgnoreCase(current.title())) {
                        boolean duplicate = chapterHeadings.stream().anyMatch(existing ->
                                existing.title().equalsIgnoreCase(h.title()) && existing.pageNumber() == h.pageNumber());
                        if (!duplicate) {
                            chapterHeadings.add(h);
                        }
                    }
                }
            }

            StringBuilder contentBuilder = new StringBuilder();
            if (!chapterHeadings.isEmpty()) {
                contentBuilder.append("[Headings]\n");
                for (RawHeading h : chapterHeadings) {
                    contentBuilder.append(h.title()).append(" | page:").append(h.pageNumber()).append("\n");
                }
                contentBuilder.append("[/Headings]\n\n");
            }

            String bodyText = extractTextWithPageMarkers(document, startPage, endPage);
            contentBuilder.append(bodyText);

            Integer chapterNum = current.chapterNumber();

            chapters.add(new ExtractedChapter(
                    chapterNum,
                    current.title(),
                    startPage,
                    endPage,
                    contentBuilder.toString().trim()
            ));
        }

        return chapters;
    }

    private void traverseOutlineItemWithHierarchy(PDDocument document, PDOutlineItem item, List<RawHeading> list, int depth, String parentTitle) {
        if (item == null) return;
        String rawTitle = item.getTitle();
        String currentHeadingTitle = null;
        if (rawTitle != null && !rawTitle.isBlank()) {
            int pageNumber = resolvePageNumber(document, item);
            if (pageNumber >= 1) {
                String cleanTitle = rawTitle.trim();
                Integer chapterNum = parseChapterNumber(cleanTitle);
                currentHeadingTitle = cleanTitle;
                list.add(new RawHeading(cleanTitle, pageNumber, chapterNum, depth, parentTitle));
            }
        }

        String effectiveParent = (depth == 0 && currentHeadingTitle != null) ? currentHeadingTitle : parentTitle;
        if (depth < 4) {
            for (PDOutlineItem child : item.children()) {
                traverseOutlineItemWithHierarchy(document, child, list, depth + 1, effectiveParent);
            }
        }
    }



    private int resolvePageNumber(PDDocument document, PDOutlineItem item) {
        try {
            PDDestination dest = item.getDestination();
            if (dest == null && item.getAction() instanceof PDActionGoTo goTo) {
                dest = goTo.getDestination();
            }
            if (dest instanceof PDPageDestination pageDest) {
                PDPage page = pageDest.getPage();
                if (page != null) {
                    return document.getPages().indexOf(page) + 1;
                } else {
                    int pIndex = pageDest.getPageNumber();
                    if (pIndex >= 0) {
                        return pIndex + 1;
                    }
                }
            } else if (dest instanceof PDNamedDestination namedDest) {
                PDPageDestination pageDest = document.getDocumentCatalog().findNamedDestinationPage(namedDest);
                if (pageDest != null && pageDest.getPage() != null) {
                    return document.getPages().indexOf(pageDest.getPage()) + 1;
                }
            }
        } catch (Exception ex) {
            log.debug("Unable to resolve destination for bookmark {}: {}", item.getTitle(), ex.getMessage());
        }
        return -1;
    }

    private List<RawBookmark> detectChaptersFromText(PDDocument document, int totalPages) {
        List<RawBookmark> list = new ArrayList<>();
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);

        int maxScanPages = Math.min(totalPages, 300);
        for (int p = 1; p <= maxScanPages; p++) {
            try {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String pageText = stripper.getText(document);
                if (pageText == null || pageText.isBlank()) {
                    continue;
                }

                String[] lines = pageText.split("\\r?\\n");
                int nonBlankCount = 0;
                for (String line : lines) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    nonBlankCount++;

                    Matcher chapterMatcher = CHAPTER_HEADING_PATTERN.matcher(trimmed);
                    if (chapterMatcher.find()) {
                        String numStr = chapterMatcher.group(1);
                        String subTitle = chapterMatcher.group(2);
                        Integer chNum = parseNumber(numStr);
                        String title = trimmed;
                        if (title.length() > 200) {
                            title = title.substring(0, 200).trim();
                        }
                        list.add(new RawBookmark(title, p, chNum));
                        break;
                    }

                    Matcher numMatcher = NUMBERED_SECTION_PATTERN.matcher(trimmed);
                    if (numMatcher.find() && nonBlankCount <= 2) {
                        Integer chNum = parseNumber(numMatcher.group(1));
                        String title = trimmed;
                        if (title.length() > 200) {
                            title = title.substring(0, 200).trim();
                        }
                        list.add(new RawBookmark(title, p, chNum));
                        break;
                    }

                    if (nonBlankCount >= 4) {
                        break;
                    }
                }
            } catch (Exception e) {
                log.debug("Error scanning page {} for headings: {}", p, e.getMessage());
            }
        }
        return list;
    }

    private List<RawBookmark> normalizeCandidates(List<RawBookmark> raw, int totalPages) {
        if (raw.isEmpty()) {
            return List.of(new RawBookmark("Full Document", 1, 1));
        }

        // Sort by page number ascending
        List<RawBookmark> sorted = new ArrayList<>(raw);
        sorted.sort(Comparator.comparingInt(RawBookmark::pageNumber));

        List<RawBookmark> result = new ArrayList<>();
        int lastPage = -1;
        for (RawBookmark b : sorted) {
            int p = Math.max(1, Math.min(b.pageNumber(), totalPages));
            if (p != lastPage) {
                result.add(new RawBookmark(b.title(), p, b.chapterNumber()));
                lastPage = p;
            }
        }

        if (result.isEmpty()) {
            result.add(new RawBookmark("Full Document", 1, 1));
        }

        return result;
    }

    public String extractTextWithPageMarkers(PDDocument document, int startPage, int endPage) {
        StringBuilder sb = new StringBuilder();
        int safeStart = Math.max(1, startPage);
        int safeEnd = Math.min(document.getNumberOfPages(), Math.max(safeStart, endPage));

        try {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int p = safeStart; p <= safeEnd; p++) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String text = stripper.getText(document);
                sb.append("\n[Page ").append(p).append("]\n");
                if (text != null) {
                    sb.append(text.trim()).append("\n");
                }
            }
        } catch (Exception ex) {
            log.warn("Failed extracting text between pages {} and {}: {}", safeStart, safeEnd, ex.getMessage());
        }

        return sb.toString().trim();
    }

    private Integer parseChapterNumber(String title) {
        if (title == null) return null;
        Matcher m = CHAPTER_HEADING_PATTERN.matcher(title);
        if (m.find()) {
            return parseNumber(m.group(1));
        }
        Matcher n = NUMBERED_SECTION_PATTERN.matcher(title);
        if (n.find()) {
            return parseNumber(n.group(1));
        }
        return null;
    }

    private boolean isChapterTitle(String title) {
        if (title == null) return false;
        String lower = title.toLowerCase();
        return lower.startsWith("chapter") || lower.startsWith("unit") || lower.startsWith("part")
                || lower.startsWith("section") || lower.startsWith("appendix") || lower.startsWith("introduction")
                || lower.startsWith("preface") || lower.startsWith("conclusion");
    }

    private Integer parseNumber(String numStr) {
        if (numStr == null || numStr.isBlank()) return null;
        try {
            return Integer.parseInt(numStr.trim());
        } catch (NumberFormatException e) {
            return romanToArabic(numStr.trim().toUpperCase());
        }
    }

    private Integer romanToArabic(String roman) {
        int total = 0;
        int prev = 0;
        for (int i = roman.length() - 1; i >= 0; i--) {
            int current = switch (roman.charAt(i)) {
                case 'I' -> 1;
                case 'V' -> 5;
                case 'X' -> 10;
                case 'L' -> 50;
                case 'C' -> 100;
                case 'D' -> 500;
                case 'M' -> 1000;
                default -> 0;
            };
            if (current == 0) return null;
            if (current < prev) {
                total -= current;
            } else {
                total += current;
            }
            prev = current;
        }
        return total > 0 ? total : null;
    }
}
