package com.libtrack.digital;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DigitalEditionStorageService {

    private static final Logger log = LoggerFactory.getLogger(DigitalEditionStorageService.class);
    private static final long DEFAULT_MAX_FILE_SIZE = 25L * 1024L * 1024L; // 25 MB

    private final Path storageDir;
    private final long maxFileSize;

    public DigitalEditionStorageService(
            @Value("${libtrack.storage.digital-books-dir:./storage/digital-books}") String storagePath,
            @Value("${libtrack.digital-edition.max-file-size:25MB}") String maxFileSizeStr) {
        this.storageDir = Paths.get(storagePath).toAbsolutePath().normalize();
        this.maxFileSize = parseSize(maxFileSizeStr);
        initializeDirectory();
    }

    private void initializeDirectory() {
        try {
            Files.createDirectories(storageDir);
            syncDirectories();
        } catch (IOException ex) {
            throw new DigitalEditionStorageException("Could not initialize digital books storage directory.", ex);
        }
    }

    private void syncDirectories() {
        List<Path> candidateDirs = getCandidateStorageDirs();
        for (Path sourceDir : candidateDirs) {
            if (!Files.exists(sourceDir) || !Files.isDirectory(sourceDir)) {
                continue;
            }
            try (var stream = Files.list(sourceDir)) {
                stream.filter(p -> Files.isRegularFile(p) && p.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".pdf"))
                        .forEach(p -> {
                            Path dest = storageDir.resolve(p.getFileName().toString());
                            if (!Files.exists(dest)) {
                                try {
                                    Files.copy(p, dest, StandardCopyOption.REPLACE_EXISTING);
                                    log.info("Synchronized digital edition file {} into {}", p.getFileName(), storageDir);
                                } catch (IOException e) {
                                    log.warn("Failed to synchronize digital edition {} to {}", p.getFileName(), storageDir, e);
                                }
                            }
                        });
            } catch (IOException ex) {
                log.warn("Error reading candidate digital storage directory {}", sourceDir, ex);
            }
        }
    }

    private List<Path> getCandidateStorageDirs() {
        List<Path> dirs = new java.util.ArrayList<>();
        dirs.add(storageDir);

        Path root1 = Paths.get("storage", "digital-books").toAbsolutePath().normalize();
        if (!dirs.contains(root1)) dirs.add(root1);

        Path root2 = Paths.get("backend", "storage", "digital-books").toAbsolutePath().normalize();
        if (!dirs.contains(root2)) dirs.add(root2);

        if (storageDir.getParent() != null) {
            Path parentStorage = storageDir.getParent().resolve("storage").resolve("digital-books").normalize();
            if (!dirs.contains(parentStorage)) dirs.add(parentStorage);

            Path parentBackendStorage = storageDir.getParent().resolve("backend").resolve("storage").resolve("digital-books").normalize();
            if (!dirs.contains(parentBackendStorage)) dirs.add(parentBackendStorage);
        }

        return dirs;
    }

    private Path findFile(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }

        // Check primary storageDir first
        Path primary = storageDir.resolve(storageKey).normalize();
        if (primary.startsWith(storageDir) && Files.exists(primary) && Files.isReadable(primary)) {
            return primary;
        }

        // Check candidate directories
        for (Path candidateDir : getCandidateStorageDirs()) {
            if (!Files.exists(candidateDir) || !Files.isDirectory(candidateDir)) {
                continue;
            }
            Path candidateFile = candidateDir.resolve(storageKey).normalize();
            if (candidateFile.startsWith(candidateDir) && Files.exists(candidateFile) && Files.isReadable(candidateFile)) {
                // Auto-sync into primary storageDir if missing
                try {
                    Files.createDirectories(storageDir);
                    Path target = storageDir.resolve(storageKey).normalize();
                    if (!Files.exists(target)) {
                        Files.copy(candidateFile, target, StandardCopyOption.REPLACE_EXISTING);
                        log.info("Auto-recovered and copied digital edition file {} into {}", storageKey, storageDir);
                        return target;
                    }
                } catch (IOException e) {
                    log.warn("Could not copy fallback file {} into {}", storageKey, storageDir, e);
                }
                return candidateFile;
            }
        }

        return null;
    }

    public StorageMetadata validateAndStore(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidDigitalEditionException("A non-empty PDF file is required.");
        }

        if (file.getSize() > maxFileSize) {
            long maxMb = maxFileSize / (1024 * 1024);
            throw new InvalidDigitalEditionException("File size exceeds the maximum allowed limit of " + maxMb + " MB.");
        }

        String rawFilename = file.getOriginalFilename();
        if (rawFilename == null || rawFilename.isBlank()) {
            throw new InvalidDigitalEditionException("A valid filename is required.");
        }

        String sanitizedFilename = sanitizeFilename(rawFilename);
        if (!sanitizedFilename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new InvalidDigitalEditionException("Only PDF files (.pdf) are supported.");
        }

        try (InputStream rawIn = file.getInputStream();
             BufferedInputStream bis = new BufferedInputStream(rawIn)) {
            bis.mark(1024);
            byte[] header = new byte[1024];
            int read = bis.read(header);
            if (read < 5) {
                throw new InvalidDigitalEditionException("The uploaded file is too small to be a valid PDF.");
            }
            String headerText = new String(header, 0, read, StandardCharsets.US_ASCII);
            if (!headerText.contains("%PDF-")) {
                throw new InvalidDigitalEditionException("The file content is not a valid PDF document (missing PDF signature).");
            }
            bis.reset();

            String storageKey = UUID.randomUUID().toString() + ".pdf";
            Path targetPath = storageDir.resolve(storageKey).normalize();
            if (!targetPath.startsWith(storageDir)) {
                throw new InvalidDigitalEditionException("Invalid file path detected.");
            }

            Files.copy(bis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return new StorageMetadata(storageKey, sanitizedFilename, "application/pdf", file.getSize());
        } catch (InvalidDigitalEditionException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new DigitalEditionStorageException("Failed to store uploaded digital edition.", ex);
        }
    }

    public Resource loadAsResource(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new DigitalEditionNotFoundException("Digital edition storage key is missing.");
        }
        Path filePath = findFile(storageKey);
        if (filePath == null) {
            throw new DigitalEditionNotFoundException("The requested digital edition file could not be found in storage.");
        }
        return new FileSystemResource(filePath);
    }

    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        for (Path candidateDir : getCandidateStorageDirs()) {
            try {
                if (Files.exists(candidateDir)) {
                    Path candidateFile = candidateDir.resolve(storageKey).normalize();
                    if (candidateFile.startsWith(candidateDir)) {
                        Files.deleteIfExists(candidateFile);
                    }
                }
            } catch (IOException ex) {
                log.warn("Could not delete digital edition file with storage key: {}", storageKey, ex);
            }
        }
    }

    public boolean exists(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return false;
        }
        return findFile(storageKey) != null;
    }

    public Path getStorageDir() {
        return storageDir;
    }

    private String sanitizeFilename(String filename) {
        // Strip path traversal attempts and extract only filename
        String clean = Paths.get(filename).getFileName().toString().trim();
        // Remove quotes, control characters, null bytes
        clean = clean.replaceAll("[\\r\\n\"\\u0000]", "");
        if (clean.isBlank()) {
            return "document.pdf";
        }
        return clean;
    }

    private static long parseSize(String sizeStr) {
        if (sizeStr == null || sizeStr.isBlank()) {
            return DEFAULT_MAX_FILE_SIZE;
        }
        String s = sizeStr.trim().toUpperCase(Locale.ROOT);
        try {
            if (s.endsWith("MB")) {
                return Long.parseLong(s.substring(0, s.length() - 2).trim()) * 1024 * 1024;
            } else if (s.endsWith("KB")) {
                return Long.parseLong(s.substring(0, s.length() - 2).trim()) * 1024;
            } else if (s.endsWith("GB")) {
                return Long.parseLong(s.substring(0, s.length() - 2).trim()) * 1024 * 1024 * 1024;
            } else {
                return Long.parseLong(s);
            }
        } catch (NumberFormatException ex) {
            return DEFAULT_MAX_FILE_SIZE;
        }
    }

    public record StorageMetadata(String storageKey, String originalFilename, String contentType, long fileSize) {}
}
