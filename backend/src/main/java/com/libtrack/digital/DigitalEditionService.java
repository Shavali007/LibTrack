package com.libtrack.digital;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;
import com.libtrack.catalogue.Book;
import com.libtrack.catalogue.BookNotFoundException;
import com.libtrack.catalogue.BookRepository;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DigitalEditionService {

    private final DigitalEditionRepository digitalEditions;
    private final BookRepository books;
    private final UserAccountRepository accounts;
    private final DigitalEditionStorageService storageService;
    private final DigitalEditionChapterService chapterService;

    public DigitalEditionService(DigitalEditionRepository digitalEditions,
                                 BookRepository books,
                                 UserAccountRepository accounts,
                                 DigitalEditionStorageService storageService,
                                 DigitalEditionChapterService chapterService) {
        this.digitalEditions = digitalEditions;
        this.books = books;
        this.accounts = accounts;
        this.storageService = storageService;
        this.chapterService = chapterService;
    }

    @Transactional(readOnly = true)
    public DigitalEditionResponse getEdition(UUID bookId) {
        if (!books.existsById(bookId)) {
            throw new BookNotFoundException();
        }
        DigitalEdition edition = digitalEditions.findByBookId(bookId)
                .orElseThrow(DigitalEditionNotFoundException::new);
        return toResponse(edition);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public DigitalEditionResponse uploadOrReplace(UUID bookId, MultipartFile file, String editionLabel, UUID uploaderId) {
        Book book = books.findById(bookId).filter(Book::isActive).orElseThrow(BookNotFoundException::new);
        DigitalEditionStorageService.StorageMetadata metadata = storageService.validateAndStore(file);

        UserAccount uploader = null;
        if (uploaderId != null) {
            uploader = accounts.findById(uploaderId).orElse(null);
        }

        String cleanLabel = editionLabel != null && !editionLabel.isBlank() ? editionLabel.strip() : null;

        DigitalEdition existing = digitalEditions.findByBookId(bookId).orElse(null);
        String oldStorageKey = null;

        try {
            DigitalEdition saved;
            if (existing != null) {
                oldStorageKey = existing.getStorageKey();
                existing.update(metadata.storageKey(), metadata.originalFilename(), metadata.contentType(),
                        metadata.fileSize(), cleanLabel, uploader);
                saved = digitalEditions.saveAndFlush(existing);
            } else {
                DigitalEdition newEdition = new DigitalEdition(book, metadata.storageKey(), metadata.originalFilename(),
                        metadata.contentType(), metadata.fileSize(), cleanLabel, uploader);
                saved = digitalEditions.saveAndFlush(newEdition);
            }

            // Cleanup old file after successful DB persistence
            if (oldStorageKey != null && !oldStorageKey.equals(metadata.storageKey())) {
                storageService.delete(oldStorageKey);
            }

            try {
                chapterService.indexChaptersForEdition(saved, false);
            } catch (Exception e) {
                // Do not fail upload if chapter extraction encounters an issue
            }

            return toResponse(saved);
        } catch (Exception ex) {
            // DB persistence failed; clean up newly stored file to prevent orphaned storage
            storageService.delete(metadata.storageKey());
            if (ex instanceof DataIntegrityViolationException) {
                throw new InvalidDigitalEditionException("A digital edition already exists or conflicts for this book.");
            }
            throw ex;
        }
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional
    public void removeEdition(UUID bookId) {
        if (!books.existsById(bookId)) {
            throw new BookNotFoundException();
        }
        DigitalEdition edition = digitalEditions.findByBookId(bookId)
                .orElseThrow(DigitalEditionNotFoundException::new);

        String storageKey = edition.getStorageKey();
        digitalEditions.delete(edition);
        digitalEditions.flush();

        storageService.delete(storageKey);
    }

    @PreAuthorize("hasAnyRole('STUDENT','FACULTY','LIBRARIAN')")
    @Transactional(readOnly = true)
    public DigitalFileDownload loadContent(UUID bookId, boolean librarian) {
        Book book = books.findById(bookId).filter(b -> b.isActive() || librarian)
                .orElseThrow(BookNotFoundException::new);
        DigitalEdition edition = digitalEditions.findByBookId(book.getId())
                .orElseThrow(DigitalEditionNotFoundException::new);

        Resource resource = storageService.loadAsResource(edition.getStorageKey());
        return new DigitalFileDownload(resource, edition.getOriginalFilename(), edition.getContentType(), edition.getFileSize());
    }

    public boolean hasDigitalEdition(UUID bookId) {
        return digitalEditions.existsByBookId(bookId);
    }

    private static DigitalEditionResponse toResponse(DigitalEdition edition) {
        return new DigitalEditionResponse(
                edition.getId(),
                edition.getBook().getId(),
                edition.getOriginalFilename(),
                edition.getContentType(),
                edition.getFileSize(),
                edition.getEditionLabel(),
                edition.getUpdatedAt() != null ? edition.getUpdatedAt() : edition.getCreatedAt()
        );
    }

    public record DigitalFileDownload(Resource resource, String filename, String contentType, long fileSize) {}
}
