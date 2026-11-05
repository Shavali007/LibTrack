package com.libtrack.digital;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "digital_edition_chapter")
public class DigitalEditionChapter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "digital_edition_id", nullable = false)
    private DigitalEdition digitalEdition;

    @Column(name = "chapter_number")
    private Integer chapterNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "start_page", nullable = false)
    private int startPage;

    @Column(name = "end_page", nullable = false)
    private int endPage;

    @Column(name = "content", columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "is_manually_edited", nullable = false)
    private boolean manuallyEdited;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DigitalEditionChapter() {}

    public DigitalEditionChapter(DigitalEdition digitalEdition, Integer chapterNumber, String title,
                                 int startPage, int endPage, String content, boolean manuallyEdited) {
        this.digitalEdition = digitalEdition;
        this.chapterNumber = chapterNumber;
        this.title = title;
        this.startPage = startPage;
        this.endPage = endPage;
        this.content = content;
        this.manuallyEdited = manuallyEdited;
    }

    public void update(Integer chapterNumber, String title, int startPage, int endPage, String content, boolean manuallyEdited) {
        this.chapterNumber = chapterNumber;
        this.title = title;
        this.startPage = startPage;
        this.endPage = endPage;
        if (content != null) {
            this.content = content;
        }
        this.manuallyEdited = manuallyEdited;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public DigitalEdition getDigitalEdition() { return digitalEdition; }
    public Integer getChapterNumber() { return chapterNumber; }
    public String getTitle() { return title; }
    public int getStartPage() { return startPage; }
    public int getEndPage() { return endPage; }
    public String getContent() { return content; }
    public boolean isManuallyEdited() { return manuallyEdited; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setContent(String content) { this.content = content; }
    public void setManuallyEdited(boolean manuallyEdited) { this.manuallyEdited = manuallyEdited; }
}
