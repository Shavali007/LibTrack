package com.libtrack.catalogue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "book", uniqueConstraints = @UniqueConstraint(name = "uq_book_isbn", columnNames = "isbn"))
public class Book {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 240)
    private String title;
    @Column(length = 13)
    private String isbn;
    @Column(length = 4000)
    private String description;
    @Column(length = 200)
    private String publisher;
    @Column(name = "publication_year")
    private Integer publicationYear;
    @Column(name = "cover_image_url", length = 2048)
    private String coverImageUrl;
    @Enumerated(EnumType.STRING)
    @Column(name = "circulation_policy", nullable = false, length = 40)
    private CirculationPolicy circulationPolicy;
    @Column(nullable = false)
    private boolean active = true;
    @ManyToMany
    @JoinTable(name = "book_author", joinColumns = @JoinColumn(name = "book_id"), inverseJoinColumns = @JoinColumn(name = "author_id"),
            uniqueConstraints = @UniqueConstraint(name = "uq_book_author", columnNames = {"book_id", "author_id"}))
    private Set<Author> authors = new LinkedHashSet<>();
    @ManyToMany
    @JoinTable(name = "book_category", joinColumns = @JoinColumn(name = "book_id"), inverseJoinColumns = @JoinColumn(name = "category_id"),
            uniqueConstraints = @UniqueConstraint(name = "uq_book_category", columnNames = {"book_id", "category_id"}))
    private Set<Category> categories = new LinkedHashSet<>();
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Book() {}
    public Book(String title, String isbn, String description, String publisher, Integer publicationYear, String coverImageUrl,
                CirculationPolicy circulationPolicy, Set<Author> authors, Set<Category> categories) {
        update(title, isbn, description, publisher, publicationYear, coverImageUrl, circulationPolicy, authors, categories);
        active = true;
    }
    public void update(String title, String isbn, String description, String publisher, Integer publicationYear, String coverImageUrl,
                       CirculationPolicy circulationPolicy, Set<Author> authors, Set<Category> categories) {
        this.title = title; this.isbn = isbn; this.description = description; this.publisher = publisher;
        this.publicationYear = publicationYear; this.coverImageUrl = coverImageUrl; this.circulationPolicy = circulationPolicy;
        this.authors = new LinkedHashSet<>(authors); this.categories = new LinkedHashSet<>(categories);
    }
    public void deactivate() { active = false; }
    @PrePersist void onCreate() { Instant now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getIsbn() { return isbn; }
    public String getDescription() { return description; }
    public String getPublisher() { return publisher; }
    public Integer getPublicationYear() { return publicationYear; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public CirculationPolicy getCirculationPolicy() { return circulationPolicy; }
    public boolean isActive() { return active; }
    public Set<Author> getAuthors() { return authors; }
    public Set<Category> getCategories() { return categories; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
