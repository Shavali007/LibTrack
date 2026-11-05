package com.libtrack.digital;

import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DigitalEditionChapterService {

    private static final Logger log = LoggerFactory.getLogger(DigitalEditionChapterService.class);

    private static final Pattern CHAPTER_PREFIX_PATTERN = Pattern.compile(
            "^\\s*(?:chapter|ch\\.?|unit|part|section)\\s+(?:\\d+|[ivxlcdm]+)[^\\p{Alnum}]+\\s*(.+)$",
            Pattern.CASE_INSENSITIVE
    );

    private final DigitalEditionChapterRepository chapterRepository;
    private final DigitalEditionRepository digitalEditionRepository;
    private final BookRepository bookRepository;
    private final DigitalEditionStorageService storageService;
    private final PdfChapterExtractor chapterExtractor;
    private final DataSource dataSource;
    private final TransactionTemplate transactionTemplate;
    private final ConcurrentHashMap<UUID, Object> indexingLocks = new ConcurrentHashMap<>();

    public DigitalEditionChapterService(
            DigitalEditionChapterRepository chapterRepository,
            DigitalEditionRepository digitalEditionRepository,
            BookRepository bookRepository,
            DigitalEditionStorageService storageService,
            PdfChapterExtractor chapterExtractor,
            DataSource dataSource,
            PlatformTransactionManager transactionManager) {
        this.chapterRepository = chapterRepository;
        this.digitalEditionRepository = digitalEditionRepository;
        this.bookRepository = bookRepository;
        this.storageService = storageService;
        this.chapterExtractor = chapterExtractor;
        this.dataSource = dataSource;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void ensureChaptersIndexed(DigitalEdition edition) {
        if (edition == null) return;
        UUID editionId = edition.getId();
        if (chapterRepository.countByDigitalEdition_Id(editionId) > 0) {
            return;
        }

        Object lock = indexingLocks.computeIfAbsent(editionId, k -> new Object());
        synchronized (lock) {
            try {
                if (chapterRepository.countByDigitalEdition_Id(editionId) == 0) {
                    transactionTemplate.executeWithoutResult(status -> {
                        indexChaptersForEdition(edition, false);
                    });
                }
            } finally {
                indexingLocks.remove(editionId, lock);
            }
        }
    }

    @Transactional
    public List<ChapterResponse> getChaptersForBook(UUID bookId) {
        DigitalEdition edition = findEditionByBookId(bookId);
        ensureChaptersIndexed(edition);
        return chapterRepository.findByDigitalEdition_IdOrderByStartPageAscChapterNumberAsc(edition.getId())
                .stream()
                .map(ChapterResponse::from)
                .toList();
    }

    @Transactional
    public void indexChaptersForEdition(DigitalEdition edition, boolean overwriteManual) {
        if (edition == null) return;
        try {
            Resource resource = storageService.loadAsResource(edition.getStorageKey());
            List<PdfChapterExtractor.ExtractedChapter> extracted;
            if (resource.isFile()) {
                extracted = chapterExtractor.extractChapters(resource.getFile());
            } else {
                try (InputStream is = resource.getInputStream()) {
                    extracted = chapterExtractor.extractChapters(is);
                }
            }

            if (extracted.isEmpty()) {
                log.info("No chapters or bookmarks extracted for digital edition {}", edition.getId());
                return;
            }

            List<DigitalEditionChapter> existingChapters = chapterRepository.findByDigitalEdition_Id(edition.getId());
            List<DigitalEditionChapter> manualChapters = overwriteManual
                    ? List.of()
                    : existingChapters.stream()
                            .filter(DigitalEditionChapter::isManuallyEdited)
                            .toList();

            if (overwriteManual) {
                chapterRepository.deleteByDigitalEdition_Id(edition.getId());
            } else {
                chapterRepository.deleteByDigitalEdition_IdAndManuallyEditedFalse(edition.getId());
            }
            chapterRepository.flush();

            List<DigitalEditionChapter> entities = new ArrayList<>();
            for (PdfChapterExtractor.ExtractedChapter ext : extracted) {
                if (!overwriteManual && !manualChapters.isEmpty()) {
                    boolean matchesManual = manualChapters.stream().anyMatch(m ->
                            (ext.chapterNumber() != null && ext.chapterNumber().equals(m.getChapterNumber())) ||
                            (ext.title() != null && ext.title().equalsIgnoreCase(m.getTitle())) ||
                            (ext.startPage() == m.getStartPage())
                    );
                    if (matchesManual) {
                        continue;
                    }
                }

                DigitalEditionChapter chapter = new DigitalEditionChapter(
                        edition,
                        ext.chapterNumber(),
                        ext.title(),
                        ext.startPage(),
                        ext.endPage(),
                        ext.content(),
                        false
                );
                entities.add(chapter);
            }

            chapterRepository.saveAllAndFlush(entities);
            log.info("Successfully indexed {} chapters for digital edition {}", entities.size(), edition.getId());
        } catch (Exception ex) {
            log.warn("Automatic chapter indexing failed for digital edition {}: {}", edition.getId(), ex.getMessage(), ex);
        }
    }

    private record HeadingMatchCandidate(
            String title,
            int pageNumber,
            int rank,
            String chapterContext
    ) {}

    @Transactional
    public ChapterSearchResponse searchChapters(UUID bookId, String query, int page, int size) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 10;

        DigitalEdition edition = findEditionByBookId(bookId);
        ensureChaptersIndexed(edition);

        if (query == null || query.isBlank()) {
            return new ChapterSearchResponse("", List.of(), 0, 0, page, size, 0, 0);
        }

        String cleanQuery = query.trim();
        String strippedQuery = extractPrefixNormalizedQuery(cleanQuery);
        String primaryQuery = (strippedQuery != null && !strippedQuery.isBlank()) ? strippedQuery : cleanQuery;

        Pageable pageable = PageRequest.of(page, size);
        Page<DigitalEditionChapter> chapterPage = executeSearch(edition.getId(), primaryQuery, pageable);
        String effectiveQuery = primaryQuery;

        if (chapterPage.isEmpty() && !primaryQuery.equals(cleanQuery)) {
            Page<DigitalEditionChapter> fallbackPage = executeSearch(edition.getId(), cleanQuery, pageable);
            if (!fallbackPage.isEmpty()) {
                chapterPage = fallbackPage;
                effectiveQuery = cleanQuery;
            }
        }

        List<ChapterSearchResultItem> items = new ArrayList<>();
        int totalMatchesAcrossPage = 0;

        // 1. Heading-Based Search First: Prioritize document structure and headings
        for (DigitalEditionChapter chapter : chapterPage.getContent()) {
            List<ChapterSearchMatch> headingMatches = extractHeadingMatches(edition, chapter, effectiveQuery);
            if (!headingMatches.isEmpty()) {
                totalMatchesAcrossPage += headingMatches.size();
                items.add(new ChapterSearchResultItem(
                        chapter.getId(),
                        chapter.getChapterNumber(),
                        chapter.getTitle(),
                        chapter.getStartPage(),
                        chapter.getEndPage(),
                        chapter.isManuallyEdited(),
                        headingMatches.size(),
                        headingMatches
                ));
            }
        }

        // 2. Fallback to Paragraph Search ONLY if zero heading matches exist across all chapters
        if (items.isEmpty()) {
            for (DigitalEditionChapter chapter : chapterPage.getContent()) {
                List<ChapterSearchMatch> paragraphMatches = extractMatches(chapter, effectiveQuery);
                if (!paragraphMatches.isEmpty()) {
                    totalMatchesAcrossPage += paragraphMatches.size();
                    items.add(new ChapterSearchResultItem(
                            chapter.getId(),
                            chapter.getChapterNumber(),
                            chapter.getTitle(),
                            chapter.getStartPage(),
                            chapter.getEndPage(),
                            chapter.isManuallyEdited(),
                            paragraphMatches.size(),
                            paragraphMatches
                    ));
                }
            }
        }

        return new ChapterSearchResponse(
                cleanQuery,
                items,
                items,
                items.size(),
                totalMatchesAcrossPage,
                chapterPage.getNumber(),
                chapterPage.getSize(),
                chapterPage.getTotalElements(),
                chapterPage.getTotalPages()
        );
    }

    private List<PdfChapterExtractor.RawHeading> getHeadingsForChapter(DigitalEdition edition, DigitalEditionChapter chapter) {
        List<PdfChapterExtractor.RawHeading> headings = PdfChapterExtractor.parseHeadingsFromContent(
                chapter.getContent(), chapter.getTitle(), chapter.getStartPage());
        if (headings.size() <= 1 && edition != null) {
            try {
                Resource resource = storageService.loadAsResource(edition.getStorageKey());
                if (resource.isFile()) {
                    List<PdfChapterExtractor.RawHeading> allHeadings = chapterExtractor.extractAllHeadings(resource.getFile());
                    List<PdfChapterExtractor.RawHeading> chapterHeadings = allHeadings.stream()
                            .filter(h -> (h.pageNumber() >= chapter.getStartPage() && h.pageNumber() <= chapter.getEndPage())
                                    || (h.parentTitle() != null && h.parentTitle().equalsIgnoreCase(chapter.getTitle())))
                            .toList();
                    if (!chapterHeadings.isEmpty()) {
                        return chapterHeadings;
                    }
                }
            } catch (Exception ex) {
                log.debug("Could not read outline from PDF storage: {}", ex.getMessage());
            }
        }
        return headings;
    }

    private List<ChapterSearchMatch> extractHeadingMatches(DigitalEdition edition, DigitalEditionChapter chapter, String query) {
        List<PdfChapterExtractor.RawHeading> headings = getHeadingsForChapter(edition, chapter);
        if (headings.isEmpty()) {
            return List.of();
        }

        String qClean = query.trim().toLowerCase(Locale.ROOT);
        String qStripped = extractPrefixNormalizedQuery(query);
        String qEffective = (qStripped != null && !qStripped.isBlank()) ? qStripped.toLowerCase(Locale.ROOT) : qClean;
        String[] qWords = qEffective.split("\\s+");

        List<HeadingMatchCandidate> candidates = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();

        for (PdfChapterExtractor.RawHeading h : headings) {
            String title = h.title();
            if (title == null || title.isBlank()) continue;
            String lowerTitle = title.trim().toLowerCase(Locale.ROOT);

            int rank = -1;
            if (lowerTitle.equals(qEffective) || lowerTitle.equals(qClean)) {
                rank = 0;
            } else if (lowerTitle.startsWith(qEffective) || lowerTitle.startsWith(qClean)) {
                rank = 1;
            } else if (matchesWordBoundary(lowerTitle, qEffective) || matchesWordBoundary(lowerTitle, qClean)) {
                rank = 2;
            } else if (lowerTitle.contains(qEffective) || lowerTitle.contains(qClean)) {
                rank = 3;
            } else if (allWordsMatch(lowerTitle, qWords)) {
                rank = 4;
            }

            if (rank >= 0) {
                String dedupKey = lowerTitle + "@" + h.pageNumber();
                if (seen.add(dedupKey)) {
                    candidates.add(new HeadingMatchCandidate(h.title().trim(), h.pageNumber(), rank, chapter.getTitle()));
                }
            }
        }

        candidates.sort(Comparator.comparingInt(HeadingMatchCandidate::rank)
                .thenComparingInt(HeadingMatchCandidate::pageNumber));

        List<ChapterSearchMatch> matches = new ArrayList<>();
        for (HeadingMatchCandidate c : candidates) {
            String snippet = extractSnippetForHeading(chapter.getContent(), c.title(), c.pageNumber(), query);
            matches.add(new ChapterSearchMatch(c.pageNumber(), snippet, c.title(), c.chapterContext()));
        }

        return matches;
    }

    private boolean matchesWordBoundary(String text, String query) {
        try {
            return Pattern.compile("\\b" + Pattern.quote(query) + "\\b", Pattern.CASE_INSENSITIVE).matcher(text).find();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean allWordsMatch(String text, String[] words) {
        if (words == null || words.length == 0) return false;
        for (String w : words) {
            if (w.length() > 1 && !text.contains(w)) {
                return false;
            }
        }
        return true;
    }

    private String extractSnippetForHeading(String content, String headingTitle, int pageNumber, String query) {
        if (content == null || content.isBlank()) {
            return headingTitle;
        }

        String pageMarker = "[Page " + pageNumber + "]";
        int pageIdx = content.indexOf(pageMarker);
        String pageText = "";
        if (pageIdx >= 0) {
            int nextMarker = content.indexOf("[Page ", pageIdx + pageMarker.length());
            pageText = (nextMarker > pageIdx)
                    ? content.substring(pageIdx + pageMarker.length(), nextMarker)
                    : content.substring(pageIdx + pageMarker.length());
        } else {
            pageText = content;
        }

        pageText = pageText.replaceAll("\\[Headings\\][\\s\\S]*?\\[/Headings\\]", " ").trim();
        if (pageText.isBlank()) {
            return headingTitle;
        }

        String lowerPage = pageText.toLowerCase(Locale.ROOT);
        String lowerHeading = headingTitle.toLowerCase(Locale.ROOT).trim();
        String lowerQuery = query.toLowerCase(Locale.ROOT).trim();

        int matchPos = lowerPage.indexOf(lowerHeading);
        if (matchPos < 0) {
            matchPos = lowerPage.indexOf(lowerQuery);
        }

        if (matchPos >= 0) {
            int start = Math.max(0, matchPos - 60);
            int end = Math.min(pageText.length(), matchPos + Math.max(lowerHeading.length(), lowerQuery.length()) + 80);
            while (start > 0 && !Character.isWhitespace(pageText.charAt(start))) start--;
            while (end < pageText.length() && !Character.isWhitespace(pageText.charAt(end))) end++;
            String snippet = pageText.substring(start, end).replaceAll("\\s+", " ").trim();
            if (start > 0) snippet = "…" + snippet;
            if (end < pageText.length()) snippet = snippet + "…";
            return snippet;
        }

        String preview = pageText.replaceAll("\\s+", " ").trim();
        if (preview.length() > 120) {
            preview = preview.substring(0, 120).trim() + "…";
        }
        return preview;
    }

    private String extractPrefixNormalizedQuery(String query) {
        if (query == null) return null;
        Matcher matcher = CHAPTER_PREFIX_PATTERN.matcher(query.trim());
        if (matcher.matches()) {
            String candidate = matcher.group(1).trim();
            return candidate.isEmpty() ? null : candidate;
        }
        return null;
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public ChapterResponse createChapter(UUID bookId, ChapterCreateRequest request) {
        DigitalEdition edition = findEditionByBookId(bookId);

        if (request.endPage() < request.startPage()) {
            throw new IllegalArgumentException("End page cannot be less than start page.");
        }

        String content = request.content();
        if (content == null || content.isBlank()) {
            content = extractContentForRange(edition, request.startPage(), request.endPage());
        }

        DigitalEditionChapter chapter = new DigitalEditionChapter(
                edition,
                request.chapterNumber(),
                request.title(),
                request.startPage(),
                request.endPage(),
                content,
                true
        );

        return ChapterResponse.from(chapterRepository.saveAndFlush(chapter));
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public ChapterResponse updateChapter(UUID bookId, UUID chapterId, ChapterUpdateRequest request) {
        DigitalEdition edition = findEditionByBookId(bookId);
        DigitalEditionChapter chapter = chapterRepository.findByIdAndDigitalEdition_Id(chapterId, edition.getId())
                .orElseThrow(() -> new ChapterNotFoundException("Chapter not found for this digital edition."));

        if (request.endPage() < request.startPage()) {
            throw new IllegalArgumentException("End page cannot be less than start page.");
        }

        String content = request.content();
        if (content == null || content.isBlank()) {
            content = extractContentForRange(edition, request.startPage(), request.endPage());
        }

        chapter.update(
                request.chapterNumber(),
                request.title(),
                request.startPage(),
                request.endPage(),
                content,
                true
        );

        return ChapterResponse.from(chapterRepository.saveAndFlush(chapter));
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public void deleteChapter(UUID bookId, UUID chapterId) {
        DigitalEdition edition = findEditionByBookId(bookId);
        DigitalEditionChapter chapter = chapterRepository.findByIdAndDigitalEdition_Id(chapterId, edition.getId())
                .orElseThrow(() -> new ChapterNotFoundException("Chapter not found for this digital edition."));
        chapterRepository.delete(chapter);
        chapterRepository.flush();
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public List<ChapterResponse> reprocessChapters(UUID bookId, boolean overwriteManual) {
        DigitalEdition edition = findEditionByBookId(bookId);
        indexChaptersForEdition(edition, overwriteManual);
        return chapterRepository.findByDigitalEdition_IdOrderByStartPageAscChapterNumberAsc(edition.getId())
                .stream()
                .map(ChapterResponse::from)
                .toList();
    }

    private DigitalEdition findEditionByBookId(UUID bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException();
        }
        return digitalEditionRepository.findByBookId(bookId)
                .orElseThrow(DigitalEditionNotFoundException::new);
    }

    private Page<DigitalEditionChapter> executeSearch(UUID editionId, String query, Pageable pageable) {
        if (isMySqlDatabase()) {
            try {
                byte[] binaryId = uuidToBytes(editionId);
                Page<DigitalEditionChapter> ftPage = chapterRepository.searchFullTextNative(binaryId, query, pageable);
                if (ftPage != null && !ftPage.isEmpty()) {
                    return ftPage;
                }
            } catch (Exception ex) {
                log.debug("MySQL fulltext search failed, falling back to LIKE: {}", ex.getMessage());
            }
        }
        return chapterRepository.searchLike(editionId, query, pageable);
    }

    private boolean isMySqlDatabase() {
        if (dataSource == null) return false;
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            return meta != null && meta.getDatabaseProductName() != null
                    && meta.getDatabaseProductName().toLowerCase(Locale.ROOT).contains("mysql");
        } catch (Exception ex) {
            return false;
        }
    }

    private byte[] uuidToBytes(UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }

    private String extractContentForRange(DigitalEdition edition, int startPage, int endPage) {
        try {
            Resource resource = storageService.loadAsResource(edition.getStorageKey());
            if (resource.isFile()) {
                return chapterExtractor.extractPageRangeText(resource.getFile(), startPage, endPage);
            }
        } catch (Exception ex) {
            log.warn("Could not extract text for page range {}-{}: {}", startPage, endPage, ex.getMessage());
        }
        return "";
    }

    private List<ChapterSearchMatch> extractMatches(DigitalEditionChapter chapter, String query) {
        List<ChapterSearchMatch> matches = new ArrayList<>();
        String content = chapter.getContent();
        if (content == null || content.isBlank() || query == null || query.isBlank()) {
            if (chapter.getTitle() != null && query != null && chapter.getTitle().toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT).trim())) {
                matches.add(new ChapterSearchMatch(chapter.getStartPage(), chapter.getTitle()));
            }
            return matches;
        }

        String lowerContent = content.toLowerCase(Locale.ROOT);
        String lowerQuery = query.toLowerCase(Locale.ROOT).trim();
        int idx = 0;
        int maxMatches = 5;

        while (idx < lowerContent.length() && matches.size() < maxMatches) {
            int found = lowerContent.indexOf(lowerQuery, idx);
            if (found < 0) {
                break;
            }

            int pageNumber = resolvePageAtPosition(content, found, chapter.getStartPage());

            int snippetStart = Math.max(0, found - 80);
            int snippetEnd = Math.min(content.length(), found + lowerQuery.length() + 80);

            while (snippetStart > 0 && !Character.isWhitespace(content.charAt(snippetStart))) {
                snippetStart--;
            }
            while (snippetEnd < content.length() && !Character.isWhitespace(content.charAt(snippetEnd))) {
                snippetEnd++;
            }

            String rawSnippet = content.substring(snippetStart, snippetEnd);
            String cleanSnippet = rawSnippet.replaceAll("\\[Page\\s+\\d+\\]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();

            String formatted = cleanSnippet;
            if (snippetStart > 0) {
                formatted = "…" + formatted;
            }
            if (snippetEnd < content.length()) {
                formatted = formatted + "…";
            }
            final String finalSnippet = formatted;

            int finalPage = pageNumber;
            boolean duplicate = matches.stream().anyMatch(m -> m.pageNumber() == finalPage && m.snippet().equals(finalSnippet));
            if (!duplicate) {
                matches.add(new ChapterSearchMatch(finalPage, finalSnippet));
            }

            idx = found + Math.max(1, lowerQuery.length());
        }

        if (matches.isEmpty() && chapter.getTitle() != null && chapter.getTitle().toLowerCase(Locale.ROOT).contains(lowerQuery)) {
            matches.add(new ChapterSearchMatch(chapter.getStartPage(), chapter.getTitle()));
        }

        return matches;
    }

    private int resolvePageAtPosition(String content, int position, int fallbackPage) {
        int lastMarker = content.lastIndexOf("[Page ", position);
        if (lastMarker >= 0) {
            int closingBracket = content.indexOf("]", lastMarker);
            if (closingBracket > lastMarker) {
                String pageStr = content.substring(lastMarker + 6, closingBracket).trim();
                try {
                    return Integer.parseInt(pageStr);
                } catch (NumberFormatException ignored) {}
            }
        }
        return fallbackPage;
    }

    private int countOccurrences(String content, String query) {
        if (content == null || query == null || query.isBlank()) return 0;
        String lower = content.toLowerCase(Locale.ROOT);
        String target = query.toLowerCase(Locale.ROOT).trim();
        if (target.isEmpty()) return 0;
        int count = 0;
        int idx = 0;
        while ((idx = lower.indexOf(target, idx)) >= 0) {
            count++;
            idx += target.length();
        }
        return count;
    }
}
